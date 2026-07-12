# Arquitetura — VTT (Virtual Tabletop)

> **Constituição do projeto.** Toda decisão de implementação deve respeitar este documento.
> Alterações de arquitetura são feitas AQUI primeiro, depois no código.
> Baseado no estudo de caso "Desenvolvimento de VTT para RPG" (jul/2026), com correções aplicadas.

## 1. Visão

Plataforma de mesa virtual (VTT) web, colaborativa e em tempo real, para RPG de mesa.
Substitui a VTT anterior (React/Vite/Firebase) — projeto novo, do zero, com as lições aprendidas.

**Filosofia: o caminho do Owlbear, não o do Foundry.** Instantâneo de usar, minimalista no
que expõe, sofisticado no que esconde. Feito é melhor que perfeito: cada milestone entrega
algo jogável na mesa real.

- **Primeiro sistema de regras: Ordem Paranormal (OP).** O núcleo é agnóstico de sistema
  (JSON Schema), mas a v1 implementa e valida apenas OP com mesa real.
- **MVP = Milestones 0–4.** Fog of war, dados 3D e extensões vêm depois.

## 2. Decisões de arquitetura (e por quê)

| # | Decisão | Justificativa |
|---|---------|---------------|
| D1 | **Vite SPA** (não Next.js) | VTT é ~95% app client-side de canvas. SSR/RSC não agregam nada ao tabuleiro e criam atrito com PixiJS (hidratação, `"use client"`). Landing page/SEO, se necessário, será projeto separado. |
| D2 | **PixiJS v8** para o tabuleiro | WebGL/WebGPU com fallback, batching maduro, provado em produção (Foundry). Render loop 100% fora do React. |
| D3 | **Local-first com Yjs (CRDT)** | Latência zero nas ações locais, convergência matemática em edições concorrentes, resiliência a queda de rede. Elimina a classe inteira de bugs de dessincronização da VTT antiga. |
| D4 | **Provider de sync plugável** | Supabase Realtime NÃO é provider Yjs (sem persistência de updates, sem sync inicial). Dev: `y-websocket` local. Produção: decidir no M3 entre PartyKit/Cloudflare Durable Objects (recomendado) ou Hocuspocus em VPS. O código depende apenas da interface `SyncProvider`. |
| D5 | **Supabase** para Auth + Postgres/RLS + Storage | Identidade, entidades "frias" (contas, campanhas, biblioteca de assets) e binários (mapas, tokens) com CDN. O banco guarda URIs, nunca blobs. Estado "quente" da sessão vive no Yjs. |
| D6 | **Fichas = dados (Zod/JSON Schema), nunca UI** | Schema versionado valida e migra fichas. A UI React é uma view descartável sobre o JSON. Permite homebrew, export PDF e novos sistemas sem refatorar banco. |
| D7 | **Core agnóstico + sistemas plugáveis** | `core/` não conhece Ordem Paranormal. Cada sistema (OP primeiro) registra schemas, fórmulas de rolagem e componentes de ficha via uma interface `GameSystem`. |
| D8 | **Extensões só em iframe sandbox + postMessage** (pós-MVP) | Modelo Owlbear: terceiros nunca tocam o DOM/estado da aplicação. Elimina XSS por design. Jamais o modelo Foundry de escopo global. |
| D9 | **TypeScript strict em tudo** | Sem `any` implícito. Zod na fronteira (rede, storage, extensões), tipos inferidos do schema para dentro. |

## 3. Stack

| Camada | Tecnologia |
|--------|-----------|
| Linguagem | TypeScript (strict) |
| Build/App | Vite + React 19 |
| Estilo/UI | Tailwind CSS v4 + Radix primitives (adicionar shadcn conforme necessidade) |
| Estado da UI | Zustand (efêmero/local) |
| Tabuleiro | PixiJS v8 |
| Estado compartilhado | Yjs (CRDT) via interface `SyncProvider` |
| Backend | Supabase: Auth, PostgreSQL + RLS, Storage (S3+CDN) |
| Dados 3D (M6) | Three.js + Cannon-es, camada WebGL transparente própria |

## 4. Princípios inegociáveis

1. **React nunca toca o render loop.** O canvas PixiJS vive em um componente-container que
   monta a `Application` uma única vez (`useEffect`, cleanup no unmount). Comunicação:
   UI → canvas por comandos imperativos; canvas → UI por eventos/callbacks. Nenhum
   estado de frame passa por `useState`.
2. **Uma única fonte da verdade por dado.** Estado compartilhado da sessão (tokens, cenas,
   fichas abertas, chat) mora no Yjs doc. Estado efêmero de UI (janela aberta, ferramenta
   selecionada) mora no Zustand. Persistência fria (contas, campanhas, assets) mora no
   Postgres. Um dado nunca mora em dois lugares.
3. **Mutação otimista, sempre.** Toda ação aplica no CRDT local primeiro (latência zero);
   o delta propaga via WebSocket em background. Clientes remotos interpolam a transição
   (tween até o vetor final validado pelo Yjs), nunca teleportam.
4. **Validação nas fronteiras.** Tudo que entra por rede, storage ou (futuro) extensão
   passa por Zod antes de tocar o estado. Dentro do sistema, confia-se nos tipos.
5. **Rolagens auditáveis.** Toda rolagem gera um registro imutável no chat (fórmula,
   resultados individuais, total, autor, timestamp). MVP rola no cliente; migração para
   rolagem server-authoritative é prevista e não pode exigir mudança no formato do registro.
6. **RLS desde o dia 1.** Nenhuma tabela sem policy. GM tem leitura/escrita plena na
   campanha; jogador só escreve nos próprios atores e lê o que o GM revelou.

## 5. Estrutura de pastas

```
src/
├── core/                    # Domínio puro. Zero imports de React/Pixi/Supabase.
│   ├── schemas/             # Zod: Campaign, Scene, Token, Actor, Item, ChatMessage, Wall
│   ├── dice/                # Parser de notação (2d20kh1+5) e roller
│   └── systems/             # Interface GameSystem + registro
│       └── ordem-paranormal/  # Schemas OP, perícias, rolagens, cálculo derivado
├── canvas/                  # Engine PixiJS. Zero imports de React.
│   ├── layers/              # background, tiles, grid, templates, tokens, overhead, lighting, ui
│   └── geometry/            # (M5) quadtree, raycasting, polígono de visão
├── sync/                    # Yjs: estrutura do doc, interface SyncProvider, presence, undo
├── data/                    # Supabase: client, repositórios, upload de assets
├── ui/                      # React: HUD, janelas arrastáveis, chat
│   └── sheets/
│       └── ordem-paranormal/  # Ficha OP (view sobre o JSON do Actor)
└── app/                     # Bootstrap, rotas, providers, telas (lobby, sala)
```

**Regra de dependência:** `core` ← todos; `canvas` e `sync` não se conhecem (a sala
orquestra); `ui` pode importar de todos; ninguém importa de `app`.

## 6. Modelo de dados

### Entidades frias (Postgres + RLS)

- **profiles** — dados públicos do usuário (via Supabase Auth)
- **campaigns** — nome, sistema, dono (GM), convites/membros com papel (`gm` | `player`)
- **assets** — biblioteca de mídia do usuário/campanha (URI no Storage, dimensões, tipo)
- **scenes** — metadados: nome, campanha, dimensões, config do grid, URI do mapa
- **actors** — a ficha: `system_data JSONB` validado por Zod (schema do sistema OP),
  `owner_id`, campanha, avatar/token padrão
- **snapshots** — persistência fria do Yjs doc por cena (update binário + versão)

### Estado quente (Yjs doc, um por cena ativa)

```
scene.tokens: Y.Map<TokenState>    # posição, escala, rotação, visibilidade, actorId, condições
scene.drawings / scene.walls       # (M5)
campaign.chat: Y.Array<ChatMessage>  # append-only
presence (awareness): cursores, quem está online, token selecionado
```

### Actor OP (resumo do schema `system_data`)

- Atributos: AGI, FOR, INT, PRE, VIG
- Recursos: PV, PE, SAN (atual/máx), Defesa, NEX (5–99%), classe (Combatente | Especialista | Ocultista), trilha, origem
- Perícias: mapa perícia → grau (destreinado/treinado/veterano/expert = +0/+5/+10/+15)
- Inventário: itens embarcados (armas com fórmula de dano, equipamento, peso/espaço)
- Rituais: elemento (Conhecimento/Energia/Morte/Sangue/Medo), círculo, custo em PE
- Valores derivados (Defesa, limite de PE por turno, espaços de inventário) são **calculados,
  nunca armazenados** — função pura em `systems/ordem-paranormal`.

Rolagem OP: testes rolam `Xd20`, pega o maior (X = atributo; atributo 0 → rola 2, pega o
menor), + bônus de perícia. Notação interna: `2d20kh1+5` / `2d20kl1`.

## 7. Canvas — pilha de camadas (z-index)

1. Background (textura do mapa)
2. Tiles interativos
3. Grid
4. Templates & áreas de efeito
5. Tokens/Atores
6. Overhead (telhados/copas — máscara oclusiva com alfa dinâmico) *(pós-MVP)*
7. Lighting, fog, weather FX *(M5+)*
8. Ferramentas de interface (seleção, réguas, mira)

Viewport: pan + zoom contínuo ancorado no cursor, conversão bidirecional
mundo ↔ tela centralizada em um único módulo (`canvas/viewport.ts`).

## 8. Roadmap

| Milestone | Entrega | "Pronto" quando... |
|-----------|---------|--------------------|
| **M0** | Scaffold, este documento, CI local (`lint`, `tsc`, `test`) | `npm run dev` abre o app; estrutura de pastas criada |
| **M1** | `core`: schemas Zod (entidades + Actor OP), parser/roller de dados, testes | ficha OP válida passa no schema; `roll("2d20kh1+5")` correto e testado |
| **M2** | Canvas: cena com mapa, grid, pan/zoom, tokens com drag & drop | dá pra montar um mapa e arrastar tokens a 60fps |
| **M3** | Sync: Yjs + y-websocket dev; mover token replica entre 2 navegadores; presence; decisão do provider de produção | 2 clientes na mesma cena, sem conflito, com interpolação |
| **M4** | Fichas OP interativas + chat com rolagens + Supabase (auth, campanhas, upload de mapa, persistência de snapshot) | **MVP: uma sessão de OP real jogável de ponta a ponta** |
| M5 | Fog of war: walls, quadtree, raycasting, polígono de visão, Ghost View do GM | — |
| M6 | Dados 3D (Three.js + Cannon-es) com resultado determinístico do roller | — |
| M7 | Extensões (iframe sandbox + SDK postMessage), jukebox/soundboard sincronizado, segundo sistema de regras | — |

### Fora do escopo do MVP (explicitamente)

Fog of war/iluminação, dados 3D, extensões, áudio sincronizado, mobile, marketplace de
conteúdo, rolagem server-authoritative (formato do registro já é compatível).

## 9. Referências

- Estudo de caso original: `C:\Users\eduardo\Downloads\Desenvolvimento de VTT para RPG.pdf`
- Owlbear Rodeo 2.x (extensões sandbox, performance): blog.owlbear.rodeo
- Foundry VTT (data models, quadtree em canvas edges): foundryvtt.com/api
- Yjs docs: docs.yjs.dev

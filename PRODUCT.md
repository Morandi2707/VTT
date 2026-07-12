# Produto — Visão, Mercado e Especificação

> Este documento define O QUE construímos e POR QUÊ. O ARCHITECTURE.md define COMO.
> **Isto não é um MVP descartável — é um produto comercial.** Cada funcionalidade
> lançada deve ser completa, polida e utilizável de ponta a ponta. Preferimos uma
> feature a menos a uma feature pela metade.

## 1. Posicionamento

**A primeira mesa virtual brasileira dedicada a Ordem Paranormal** — com a
simplicidade de entrar-e-jogar do Owlbear Rodeo e a automação de ficha/rolagem
do Foundry onde ela importa.

### A oportunidade

A comunidade de Ordem Paranormal (a maior audiência de RPG do Brasil, via Cellbit)
joga hoje em:

- **Foundry + sistemas não-oficiais** (SouOWendel, Rafaellegend): exige comprar
  licença (US$ 50), hospedar servidor próprio ou pagar hosting, instalar sistema
  comunitário, interface em inglês. Barreira altíssima para o público jovem de OP.
- **Roll20 com fichas comunitárias**: gratuito porém limitado (iluminação e
  automação atrás de assinatura), UX datada, sem nada específico de OP.
- **Owlbear Rodeo**: leve e elegante, mas sem ficha, sem automação de regras —
  a mesa gerencia tudo fora da plataforma.

Nenhuma opção é: **em português, zero-config, com a ficha de OP como cidadã de
primeira classe**. Esse é o espaço.

### Referências de preço do mercado

| Plataforma | Modelo | Preço |
|---|---|---|
| Roll20 | Freemium/assinatura | Grátis · Plus US$ 5/mês · Pro US$ 10/mês |
| Foundry | Licença única (self-host) | US$ 50 + custo de hosting |
| Owlbear Rodeo | Freemium/assinatura | Grátis · ~US$ 6/mês |

Hipótese de monetização (validar na Fase 3): **freemium à la Owlbear** — jogador
nunca paga; mestre assina para desbloquear limites (nº de campanhas, storage de
mapas/áudio, fog avançado). Precificação em reais, pensada para o público BR.

## 2. Barra de qualidade

1. **Feature lançada = feature completa.** Com estado vazio desenhado, erros
   tratados, atalhos, e testada em mesa real.
2. **"Entrou na tela, tem que funcionar."** Nada de botão decorativo ou fluxo
   que termina em beco sem saída.
3. **Performance é feature**: 60 fps no tabuleiro sempre, incluindo notebook
   modesto — o público de OP é jovem.
4. **Português impecável** em toda a interface. Termos do livro de OP usados
   corretamente (NEX, PE, Sanidade, graus de treinamento, elementos).

## 3. Padrão-ouro por área (o que "completo" significa)

### Dados & Chat (referência: Foundry)
- Comandos: `/r FÓRMULA` (alias `/roll`), descrição com `# texto`
- Breakdown visível: cada dado individual, mantidos vs. descartados (kh/kl),
  crítico (20 natural) e desastre (1 natural) destacados
- Modos de rolagem (com multiplayer): pública, GM-only (`/gmr`), às cegas (`/br`)
- Rolagem a partir da ficha: clicar em perícia/arma/ritual rola com bônus certos
- Futuro: rolagens inline clicáveis em mensagens, hotbar de macros, dados 3D

### Ficha de personagem (OP)
- Barras vivas de PV/SAN/PE editáveis com clique/scroll
- Todos os derivados calculados na hora (Defesa, máximos, limite de PE/turno)
- Perícias clicáveis (rola direto pro chat), inventário com dano/crítico,
  rituais com custo de PE e círculo
- Criação guiada de personagem (classe → trilha → origem → atributos → perícias)

### Tabuleiro
- Owlbear como régua de fluidez: pan/zoom/drag sem engasgo
- Barras de PV/SAN sobre o token (visibilidade controlada pelo GM), condições
  visuais, aura de tamanho por criatura
- Réguas de distância em metros (célula = 1,5 m), templates de área de ritual

### Ferramentas de mestre
- Iniciativa com tracker visível à mesa
- Fog of war por células + visão dinâmica com paredes (fase 2)
- Jukebox/soundboard sincronizado (diferencial forte — sound design é parte
  da identidade das mesas de OP)

## 4. Roadmap de produto

### Fase 1 — Mesa jogável (em andamento)
- [x] Motor de regras OP (atributos, perícias, derivados, testes)
- [x] Motor de dados com registro auditável
- [x] Tabuleiro: grid, pan/zoom, tokens com drag & snap
- [x] **Chat com rolagem de dados** (`/r`, breakdown, críticos, bandeja construtora)
- [x] Ficha de OP interativa (rolagem por clique, barras PV/SAN/PE, derivados ao vivo, sincronizada)
- [x] Multiplayer em tempo real (Yjs) com presença e seleção colorida
- [x] Upload de mapa e tokens com imagem (persistência local; nuvem na Fase 2)
- [x] Contas e mesas (login, lobby, convite por código — Supabase Auth/RLS)
- [x] Sala de espera (lounge) com fases preparação/em jogo
- [x] Escudo do Mestre (bestiário secreto em doc separado + revelar)
- [x] Encerrar mesa permanentemente (+ exportar/importar ficha JSON)
- [ ] Inventário e rituais na ficha (armas com dano/crítico, rituais com custo de PE)
- [ ] Servidor de sync em produção (VPS Oracle + Cloudflare — em andamento com o Eduardo)
- [ ] Deploy do app (Vercel) + domínio/TLS

### Fase 2 — Beta fechado (mesas reais convidadas)
- [ ] Contas, campanhas e convites (Supabase Auth + RLS)
- [ ] Persistência completa (nada se perde entre sessões)
- [ ] Iniciativa, condições, barras no token
- [ ] Fog of war por células; réguas e templates
- [ ] Modos de rolagem (GM/blind), fichas de NPC/criatura para o mestre

### Fase 3 — Lançamento comercial
- [ ] Dados 3D com física (identidade visual própria)
- [ ] Jukebox sincronizado
- [ ] Visão dinâmica com paredes (raycasting)
- [ ] Landing page, onboarding, billing (assinatura de mestre)
- [ ] Telemetria de produto e suporte

### Pós-lançamento
- Segundo sistema de regras (D&D 5e ou T20) para ampliar mercado
- Extensões de comunidade (iframe sandbox, ARCHITECTURE.md D8)
- Marketplace de conteúdo (mapas, tokens, soundpacks)

## 5. Fontes da pesquisa

- [GM Craft Tavern — Foundry vs Roll20 vs Owlbear 2026](https://gmcrafttavern.com/foundry-vs-roll20-owlbear-2026/)
- [Foundry — Basic Dice](https://foundryvtt.com/article/dice/) · [Chat](https://foundryvtt.com/article/chat/) · [Macros](https://foundryvtt.com/article/macros/)
- [Sistema OP não-oficial p/ Foundry (SouOWendel)](https://github.com/SouOWendel/ordemparanormal_fvtt) · [Rafaellegend](https://github.com/Rafaellegend/Foundry-VTT-Ordem-Paranormal-RPG)
- [Owlbear Rodeo blog (arquitetura/UX)](https://blog.owlbear.rodeo/)

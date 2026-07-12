# VTT — instruções para o Claude Code

**Leia `ARCHITECTURE.md` antes de qualquer mudança estrutural.** Ele é a constituição do
projeto; se a tarefa conflitar com ele, atualize o documento primeiro (com aval do Eduardo).

## Regras rápidas

- TypeScript strict; sem `any`. Zod valida toda fronteira (rede/storage), tipos inferidos via `z.infer`.
- `src/core/` não importa React, Pixi nem Supabase. `src/canvas/` não importa React.
- React nunca participa do render loop do PixiJS (ver ARCHITECTURE.md §4.1).
- Estado compartilhado → Yjs; estado de UI → Zustand; persistência fria → Supabase. Nunca duplicar.
- Valores derivados de ficha (Defesa, PE/turno) são calculados por função pura, nunca salvos.
- Idioma: código/identificadores em inglês; UI, comentários e docs em pt-BR.

## Comandos

- `npm run dev` — dev server
- `npm run build` — tsc + build de produção
- `npm run lint` — eslint

## Contexto

Sistema de regras alvo da v1: **Ordem Paranormal** (`src/core/systems/ordem-paranormal/`).
Roadmap e critérios de pronto de cada milestone: ARCHITECTURE.md §8. MVP = M0–M4.

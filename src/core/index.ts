// core/ — domínio puro: schemas Zod, dados, sistemas de jogo.
// REGRA: nenhum import de React, PixiJS ou Supabase neste módulo. (ARCHITECTURE.md §5)

export * from './schemas'
export * from './dice'
export * from './systems'
export * from './chat/commands'

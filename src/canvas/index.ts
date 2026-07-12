// canvas/ — engine PixiJS do tabuleiro (camadas, viewport, geometria).
// REGRA: nenhum import de React neste módulo. (ARCHITECTURE.md §4.1, §7)

export { BoardEngine } from './board'
export type { BoardEngineInit } from './board'
export type { BoardEvent, BoardEventHandler } from './events'
export { LAYERS } from './layers'
export type { LayerId } from './layers'
export * from './math'

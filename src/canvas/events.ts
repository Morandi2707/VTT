// Eventos emitidos pela engine para a aplicação (canvas → UI).
// A UI nunca lê estado de dentro da engine; ela reage a estes eventos.

export type BoardEvent =
  | { type: 'token-moved'; tokenId: string; x: number; y: number }
  | { type: 'token-selected'; tokenId: string | null }
  | { type: 'token-activated'; tokenId: string } // duplo clique
  | { type: 'viewport-changed'; x: number; y: number; scale: number }

export type BoardEventHandler = (event: BoardEvent) => void

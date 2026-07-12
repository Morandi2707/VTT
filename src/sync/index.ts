// sync/ — estado compartilhado: Yjs doc, sessão WebSocket, presença.
// Produção: Hocuspocus em VPS Oracle atrás de Cloudflare (ver ARCHITECTURE.md D4).

export { createSyncSession } from './session'
export type { SyncSession } from './session'
export { getTokensMap, getActorsMap, getChatArray, getMetaMap } from './doc'
export { currentRoomId, generateRoomId } from './room'
export { assignColors, readPresence, setLocalPresence } from './presence'
export type { PeerPresence } from './presence'

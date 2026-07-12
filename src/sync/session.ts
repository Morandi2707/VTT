import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

// Sessão de sincronização: um Y.Doc por sala, conectado via WebSocket.
// Dev: servidor y-websocket local (npm run sync). Produção: Hocuspocus em
// VPS Oracle atrás de Cloudflare (ARCHITECTURE.md D4) — mesma interface,
// só muda VITE_SYNC_URL. Reconexão automática é responsabilidade do provider.

export interface SyncSession {
  readonly doc: Y.Doc
  readonly provider: WebsocketProvider
  readonly room: string
  /** Resolve quando o estado inicial da sala terminou de chegar. */
  readonly whenSynced: Promise<void>
  destroy(): void
}

const DEFAULT_URL = 'ws://localhost:1234'

export function createSyncSession(room: string, url?: string): SyncSession {
  const resolvedUrl =
    url ?? (import.meta.env.VITE_SYNC_URL as string | undefined) ?? DEFAULT_URL

  const doc = new Y.Doc()
  const provider = new WebsocketProvider(resolvedUrl, `vtt-${room}`, doc)

  const whenSynced = new Promise<void>((resolve) => {
    if (provider.synced) {
      resolve()
      return
    }
    const onSync = (isSynced: boolean) => {
      if (isSynced) {
        provider.off('sync', onSync)
        resolve()
      }
    }
    provider.on('sync', onSync)
  })

  return {
    doc,
    provider,
    room,
    whenSynced,
    destroy() {
      provider.destroy()
      doc.destroy()
    },
  }
}

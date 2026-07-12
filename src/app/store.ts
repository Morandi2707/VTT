import { create } from 'zustand'
import type * as Y from 'yjs'
import {
  actorSchema,
  chatMessageSchema,
  tokenSchema,
  type Actor,
  type ChatMessage,
  type Token,
} from '@/core'
import {
  createSyncSession,
  getActorsMap,
  getChatArray,
  getMetaMap,
  getTokensMap,
  readPresence,
  setLocalPresence,
  type PeerPresence,
  type SyncSession,
} from '@/sync'
import { useAuthStore } from './authStore'
import { demoActors, demoTokens } from './demo'

// Estado da MESA aberta. Tokens/atores/chat vivem no Yjs doc PÚBLICO da sala;
// o bestiário do mestre vive num doc SEPARADO (`<sala>--gm`) ao qual só o
// cliente do GM conecta — o conteúdo do escudo nem trafega pros jogadores.
// A sessão é criada por initRoomSession(roomId, opts) na rota /mesa/:id.

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'
export type RoomPhase = 'prep' | 'live'

// ── Apelido local (fallback do modo sem contas) ─────────────────────────────

const NAME_KEY = 'vtt:displayName'

function loadLocalDisplayName(): string {
  const stored = localStorage.getItem(NAME_KEY)?.trim()
  if (stored) return stored.slice(0, 24)
  const generated = `Agente ${Math.floor(100 + Math.random() * 900)}`
  localStorage.setItem(NAME_KEY, generated)
  return generated
}

function resolveDisplayName(): string {
  return useAuthStore.getState().displayName ?? loadLocalDisplayName()
}

/** Identidade para posse de fichas (userId real ou 'local' no modo demo). */
export function currentUserId(): string {
  return useAuthStore.getState().userId ?? 'local'
}

// ── Sessões da sala (públicas + escudo), inicializadas por rota ─────────────

let session: SyncSession | null = null
let yTokens: Y.Map<Token> | null = null
let yActors: Y.Map<Actor> | null = null
let yChat: Y.Array<ChatMessage> | null = null
let yMeta: Y.Map<string> | null = null
let yGmActors: Y.Map<Actor> | null = null
let teardown: (() => void) | null = null

interface BoardState {
  room: string | null
  isGm: boolean
  phase: RoomPhase
  connection: ConnectionStatus
  tokens: Record<string, Token>
  actors: Record<string, Actor>
  /** Bestiário do escudo do mestre (só populado no cliente do GM). */
  gmActors: Record<string, Actor>
  messages: ChatMessage[]
  sheet: { actorId: string; tokenId: string | null } | null
  peers: PeerPresence[]
  displayName: string
  selectedTokenId: string | null
  mapUri: string | null
  moveToken(id: string, x: number, y: number): void
  selectToken(id: string | null): void
  addToken(token: Token): void
  setTokenImage(id: string, uri: string): void
  setTokenActor(tokenId: string, actorId: string): void
  createActor(actor: Actor): void
  createGmActor(actor: Actor): void
  /** Move uma criatura do escudo para a mesa (todos passam a ver). */
  revealGmActor(id: string): void
  setActorName(id: string, name: string): void
  setActorSystemData(id: string, systemData: unknown): void
  setPhase(phase: RoomPhase): void
  openSheet(actorId: string, tokenId?: string | null): void
  closeSheet(): void
  setMapUri(uri: string | null): void
  setDisplayName(name: string): void
  sendMessage(content: ChatMessage['content']): void
}

const EMPTY_ROOM_STATE = {
  room: null,
  isGm: false,
  phase: 'prep' as RoomPhase,
  connection: 'connecting' as ConnectionStatus,
  tokens: {},
  actors: {},
  gmActors: {},
  messages: [],
  sheet: null,
  peers: [],
  selectedTokenId: null,
  mapUri: null,
}

/** Localiza o ator no doc público ou no escudo (para edições da ficha). */
function findActorMap(id: string): Y.Map<Actor> | null {
  if (yActors?.has(id)) return yActors
  if (yGmActors?.has(id)) return yGmActors
  return null
}

export const useBoardStore = create<BoardState>((set, get) => ({
  ...EMPTY_ROOM_STATE,
  displayName: resolveDisplayName(),

  moveToken: (id, x, y) => {
    const token = yTokens?.get(id)
    if (token) yTokens?.set(id, { ...token, x, y })
  },

  selectToken: (id) => {
    set({ selectedTokenId: id })
    if (session) {
      setLocalPresence(session.provider.awareness, {
        name: get().displayName,
        selectedTokenId: id,
      })
    }
  },

  addToken: (token) => {
    yTokens?.set(token.id, token)
    get().selectToken(token.id)
  },

  setTokenImage: (id, uri) => {
    const token = yTokens?.get(id)
    if (token) yTokens?.set(id, { ...token, imageUri: uri })
  },

  setTokenActor: (tokenId, actorId) => {
    const token = yTokens?.get(tokenId)
    if (token) yTokens?.set(tokenId, { ...token, actorId })
  },

  createActor: (actor) => {
    yActors?.set(actor.id, actor)
  },

  createGmActor: (actor) => {
    yGmActors?.set(actor.id, actor)
  },

  revealGmActor: (id) => {
    const actor = yGmActors?.get(id)
    if (!actor || !yActors) return
    yActors.set(id, actor)
    yGmActors?.delete(id)
    get().sendMessage({ type: 'text', text: `🛡️ O mestre revelou: ${actor.name}` })
  },

  setActorName: (id, name) => {
    const map = findActorMap(id)
    const actor = map?.get(id)
    const trimmed = name.trim()
    if (map && actor && trimmed) map.set(id, { ...actor, name: trimmed })
  },

  setActorSystemData: (id, systemData) => {
    const map = findActorMap(id)
    const actor = map?.get(id)
    if (map && actor) map.set(id, { ...actor, systemData })
  },

  setPhase: (phase) => {
    yMeta?.set('phase', phase)
  },

  openSheet: (actorId, tokenId = null) => set({ sheet: { actorId, tokenId } }),

  closeSheet: () => set({ sheet: null }),

  setMapUri: (uri) => set({ mapUri: uri }),

  setDisplayName: (name) => {
    const trimmed = name.trim().slice(0, 24)
    if (!trimmed) return
    localStorage.setItem(NAME_KEY, trimmed)
    set({ displayName: trimmed })
    void useAuthStore.getState().updateDisplayName(trimmed)
    if (session) {
      setLocalPresence(session.provider.awareness, {
        name: trimmed,
        selectedTokenId: get().selectedTokenId,
      })
    }
  },

  sendMessage: (content) => {
    if (!yChat || !session) return
    const auth = useAuthStore.getState()
    yChat.push([
      {
        id: crypto.randomUUID(),
        authorId: auth.userId ?? `peer-${session.provider.awareness.clientID}`,
        authorName: get().displayName,
        createdAt: Date.now(),
        content,
      },
    ])
  },
}))

// ── Ciclo de vida das sessões ───────────────────────────────────────────────

export interface RoomSessionOptions {
  /** Sala de demonstração: semeia conteúdo e já nasce em jogo. */
  demo?: boolean
  /** Este cliente é o mestre: conecta também no doc do escudo. */
  gm?: boolean
}

export function initRoomSession(roomId: string, opts: RoomSessionOptions = {}): void {
  if (session?.room === roomId) return
  destroyRoomSession()

  const s = createSyncSession(roomId)
  session = s
  yTokens = getTokensMap(s.doc)
  yActors = getActorsMap(s.doc)
  yChat = getChatArray(s.doc)
  yMeta = getMetaMap(s.doc)
  const awareness = s.provider.awareness

  useBoardStore.setState({
    ...EMPTY_ROOM_STATE,
    room: roomId,
    isGm: opts.gm ?? false,
    displayName: resolveDisplayName(),
  })

  const mirrorTokens = () => {
    if (!yTokens) return
    const tokens: Record<string, Token> = {}
    for (const [id, raw] of yTokens.entries()) {
      const parsed = tokenSchema.safeParse(raw)
      if (parsed.success) tokens[id] = parsed.data
      else console.warn(`[sync] Token inválido descartado (${id})`, parsed.error)
    }
    useBoardStore.setState({ tokens })
  }

  const mirrorActors = () => {
    if (!yActors) return
    const actors: Record<string, Actor> = {}
    for (const [id, raw] of yActors.entries()) {
      const parsed = actorSchema.safeParse(raw)
      if (parsed.success) actors[id] = parsed.data
      else console.warn(`[sync] Ator inválido descartado (${id})`, parsed.error)
    }
    useBoardStore.setState({ actors })
  }

  const mirrorChat = () => {
    if (!yChat) return
    const messages: ChatMessage[] = []
    for (const raw of yChat.toArray()) {
      const parsed = chatMessageSchema.safeParse(raw)
      if (parsed.success) messages.push(parsed.data)
    }
    useBoardStore.setState({ messages })
  }

  const mirrorMeta = () => {
    useBoardStore.setState({ phase: yMeta?.get('phase') === 'live' ? 'live' : 'prep' })
  }

  const mirrorPresence = () => {
    useBoardStore.setState({ peers: readPresence(awareness) })
  }

  const onStatus = ({ status }: { status: string }) => {
    useBoardStore.setState({
      connection:
        status === 'connected'
          ? 'connected'
          : status === 'connecting'
            ? 'connecting'
            : 'disconnected',
    })
  }

  yTokens.observe(mirrorTokens)
  yActors.observe(mirrorActors)
  yChat.observe(mirrorChat)
  yMeta.observe(mirrorMeta)
  awareness.on('change', mirrorPresence)
  s.provider.on('status', onStatus)

  setLocalPresence(awareness, { name: resolveDisplayName(), selectedTokenId: null })
  mirrorPresence()

  // Escudo do mestre: doc separado, só o cliente do GM conecta.
  let gmTeardown: (() => void) | null = null
  if (opts.gm) {
    const gs = createSyncSession(`${roomId}--gm`)
    yGmActors = getActorsMap(gs.doc)

    const mirrorGmActors = () => {
      if (!yGmActors) return
      const gmActors: Record<string, Actor> = {}
      for (const [id, raw] of yGmActors.entries()) {
        const parsed = actorSchema.safeParse(raw)
        if (parsed.success) gmActors[id] = parsed.data
      }
      useBoardStore.setState({ gmActors })
    }
    yGmActors.observe(mirrorGmActors)
    gmTeardown = () => {
      yGmActors?.unobserve(mirrorGmActors)
      gs.destroy()
    }
  }

  // Sala demo: conteúdo semeado e fase 'live' (não há lounge sem mestre real).
  if (opts.demo) {
    void s.whenSynced.then(() => {
      if (session !== s) return
      const tokensWereEmpty = yTokens?.size === 0
      s.doc.transact(() => {
        if (!yMeta?.get('phase')) yMeta?.set('phase', 'live')
        if (yActors?.size === 0) {
          for (const actor of demoActors) yActors.set(actor.id, actor)
        }
        for (const token of demoTokens) {
          const existing = yTokens?.get(token.id)
          if (!existing) {
            if (tokensWereEmpty) yTokens?.set(token.id, token)
          } else if (!existing.actorId) {
            yTokens?.set(token.id, { ...existing, actorId: token.actorId })
          }
        }
      })
    })
  }

  teardown = () => {
    yTokens?.unobserve(mirrorTokens)
    yActors?.unobserve(mirrorActors)
    yChat?.unobserve(mirrorChat)
    yMeta?.unobserve(mirrorMeta)
    awareness.off('change', mirrorPresence)
    s.provider.off('status', onStatus)
    gmTeardown?.()
    s.destroy()
  }
}

export function destroyRoomSession(): void {
  teardown?.()
  teardown = null
  session = null
  yTokens = null
  yActors = null
  yChat = null
  yMeta = null
  yGmActors = null
  useBoardStore.setState({ ...EMPTY_ROOM_STATE })
}

if (import.meta.env.DEV) {
  Object.assign(globalThis, { __vttStore: useBoardStore })
}

// HMR: destrói a sessão antiga antes do módulo recarregar — sem isso o
// provider anterior fica conectado e vira um "fantasma" na presença.
if (import.meta.hot) {
  import.meta.hot.dispose(() => destroyRoomSession())
}

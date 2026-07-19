import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { BoardEvent } from '@/canvas'
import { snapToCellCenter } from '@/canvas'
import { actorSchema, ordemParanormalSystem, tokenSchema } from '@/core'
import { useAuthStore } from '@/app/authStore'
import { demoScene } from '@/app/demo'
import { destroyRoomSession, initRoomSession, useBoardStore } from '@/app/store'
import {
  deleteCampaign,
  getCampaign,
  getInviteCode,
  joinCampaignByCode,
} from '@/data/campaigns'
import { isSupabaseConfigured } from '@/data/supabase'
import { uploadAsset } from '@/data/assets'
import { loadLocalAsset, saveLocalAsset, deleteLocalAsset, sceneMapKey } from '@/data/localAssets'
import { LoungeView } from '@/app/pages/LoungeView'
import { BoardCanvas } from '@/ui/board/BoardCanvas'
import { BoardToolbar } from '@/ui/board/BoardToolbar'
import { PresenceBar } from '@/ui/board/PresenceBar'
import { SyncWarning } from '@/ui/board/SyncWarning'
import { ChatPanel } from '@/ui/chat/ChatPanel'
import { GmScreen } from '@/ui/gm/GmScreen'
import { OpSheetWindow } from '@/ui/sheets/ordem-paranormal/OpSheet'

function fileBaseName(file: File): string {
  const base = file.name.replace(/\.[^.]+$/, '').trim()
  return base.length > 0 ? base : 'Token'
}

const CONNECTION_LABEL = {
  connecting: '🟡 conectando…',
  connected: '🟢 ao vivo',
  disconnected: '🔴 reconectando…',
} as const

type Access =
  | { state: 'checking' }
  | { state: 'ok'; campaignName: string; isGm: boolean }
  | { state: 'denied' }

/** Tela de "sem acesso": pede o código de convite da mesa. */
function AccessGate({ roomId, onJoined }: { roomId: string; onJoined(): void }) {
  const [params] = useSearchParams()
  const codeFromLink = params.get('convite') ?? ''
  const [code, setCode] = useState(codeFromLink)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const autoTried = useRef(false)

  const join = useCallback(
    async (rawCode: string) => {
      setBusy(true)
      setError(null)
      try {
        const joinedId = await joinCampaignByCode(rawCode)
        if (joinedId !== roomId) {
          setError('Esse código é de outra mesa.')
          return
        }
        onJoined()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Código inválido.')
      } finally {
        setBusy(false)
      }
    },
    [roomId, onJoined],
  )

  // Link de convite (?convite=...): entra sozinho, sem pedir nada ao jogador.
  useEffect(() => {
    if (codeFromLink && !autoTried.current) {
      autoTried.current = true
      void join(codeFromLink)
    }
  }, [codeFromLink, join])

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    await join(code)
  }

  if (codeFromLink && busy) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-sm text-zinc-500">Entrando na mesa…</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-center">
        <p className="text-2xl">🚪</p>
        <h1 className="mt-2 text-lg font-bold text-zinc-100">Você ainda não está nesta mesa</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Peça o código de convite ao mestre e cole aqui.
        </p>
        <form onSubmit={handleJoin} className="mt-4 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="código de convite"
            className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:font-sans placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !code.trim()}
            className="rounded-lg bg-cyan-700 px-4 text-sm font-bold text-white hover:bg-cyan-600 disabled:opacity-40"
          >
            Entrar
          </button>
        </form>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        <Link to="/" className="mt-4 inline-block text-xs text-zinc-500 hover:text-zinc-300">
          ← Voltar ao lobby
        </Link>
      </div>
    </main>
  )
}

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const authStatus = useAuthStore((s) => s.status)
  const userId = useAuthStore((s) => s.userId)
  const [params] = useSearchParams()
  const [access, setAccess] = useState<Access>({ state: 'checking' })

  // ── Verificação de acesso + papel (membro/mestre da campanha) ─────────────
  const checkAccess = useCallback(() => {
    if (!roomId) return
    if (!isSupabaseConfigured) {
      // Modo demo: todos são mestres — ?papel=jogador força a visão do jogador.
      setAccess({
        state: 'ok',
        campaignName: demoScene.name,
        isGm: params.get('papel') !== 'jogador',
      })
      return
    }
    setAccess({ state: 'checking' })
    getCampaign(roomId)
      .then((campaign) =>
        setAccess(
          campaign
            ? { state: 'ok', campaignName: campaign.name, isGm: campaign.gmId === userId }
            : { state: 'denied' },
        ),
      )
      .catch(() => setAccess({ state: 'denied' }))
  }, [roomId, userId, params])

  useEffect(() => {
    if (authStatus === 'signedIn' || authStatus === 'unconfigured') checkAccess()
  }, [authStatus, checkAccess])

  // ── Sessão de sync (apenas com acesso confirmado) ─────────────────────────
  useEffect(() => {
    if (!roomId || access.state !== 'ok') return
    initRoomSession(roomId, { demo: !isSupabaseConfigured, gm: access.isGm })
    return () => destroyRoomSession()
  }, [roomId, access])

  if (!roomId) return <Navigate to="/" replace />
  if (isSupabaseConfigured && authStatus === 'signedOut') {
    return <Navigate to={`/login?next=/mesa/${roomId}`} replace />
  }
  if (authStatus === 'loading' || access.state === 'checking') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-sm text-zinc-500">Preparando a mesa…</p>
      </main>
    )
  }
  if (access.state === 'denied') return <AccessGate roomId={roomId} onJoined={checkAccess} />

  return <RoomOrLounge roomId={roomId} campaignName={access.campaignName} isGm={access.isGm} />
}

/** Jogador em mesa em preparação vê o lounge; mestre vê sempre o tabuleiro. */
function RoomOrLounge({
  roomId,
  campaignName,
  isGm,
}: {
  roomId: string
  campaignName: string
  isGm: boolean
}) {
  const phase = useBoardStore((s) => s.phase)
  if (phase === 'prep' && !isGm) {
    return <LoungeView roomId={roomId} campaignName={campaignName} />
  }
  return <RoomView roomId={roomId} campaignName={campaignName} isGm={isGm} />
}

/** Confirmação de encerramento permanente da mesa. */
function EndCampaignModal({
  roomId,
  campaignName,
  onCancel,
}: {
  roomId: string
  campaignName: string
  onCancel(): void
}) {
  const navigate = useNavigate()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleEnd() {
    setBusy(true)
    setError(null)
    try {
      await deleteCampaign(roomId)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível encerrar.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-red-900/50 bg-zinc-950 p-6">
        <h2 className="text-lg font-bold text-red-300">Encerrar mesa permanentemente</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Estamos em beta, com infraestrutura mantida pela comunidade — mesas encerradas são{' '}
          <strong className="text-zinc-200">apagadas permanentemente</strong> (mapa, tokens,
          fichas e chat) para manter o servidor leve pra todo mundo. Valeu por colaborar! 💜
        </p>
        <p className="mt-3 text-sm text-zinc-400">
          Lembre os jogadores de <strong className="text-zinc-200">baixar as fichas</strong>{' '}
          (botão na própria ficha) antes de encerrar.
        </p>
        <p className="mt-4 text-xs text-zinc-500">
          Para confirmar, digite o nome da mesa: <strong className="text-zinc-300">{campaignName}</strong>
        </p>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={campaignName}
          className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-red-800 focus:outline-none"
        />
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy || typed.trim() !== campaignName}
            onClick={handleEnd}
            className="rounded-lg bg-red-800 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-40"
          >
            {busy ? 'Encerrando…' : 'Encerrar para sempre'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── A mesa em si (tabuleiro + HUD + chat + ficha) ────────────────────────────

function RoomView({
  roomId,
  campaignName,
  isGm,
}: {
  roomId: string
  campaignName: string
  isGm: boolean
}) {
  const tokens = useBoardStore((s) => s.tokens)
  const selectedTokenId = useBoardStore((s) => s.selectedTokenId)
  const mapUri = useBoardStore((s) => s.mapUri)
  const connection = useBoardStore((s) => s.connection)
  const phase = useBoardStore((s) => s.phase)
  const peers = useBoardStore((s) => s.peers)
  const setDisplayName = useBoardStore((s) => s.setDisplayName)
  const setPhase = useBoardStore((s) => s.setPhase)
  const moveToken = useBoardStore((s) => s.moveToken)
  const selectToken = useBoardStore((s) => s.selectToken)
  const addToken = useBoardStore((s) => s.addToken)
  const setTokenImage = useBoardStore((s) => s.setTokenImage)
  const setMapUri = useBoardStore((s) => s.setMapUri)
  const [zoom, setZoom] = useState<number | null>(null)
  const [inviteState, setInviteState] = useState<'idle' | 'loading' | 'copied' | 'error'>('idle')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [gmScreenOpen, setGmScreenOpen] = useState(false)
  const [endModalOpen, setEndModalOpen] = useState(false)

  // Mestre copia um link que JÁ carrega o convite (?convite=...): o jogador
  // clica e entra direto, sem precisar receber um código à parte.
  const copyInviteLink = useCallback(async () => {
    setInviteState('loading')
    try {
      const base = `${window.location.origin}/mesa/${roomId}`
      const link =
        isGm && isSupabaseConfigured
          ? `${base}?convite=${encodeURIComponent(await getInviteCode(roomId))}`
          : base
      await navigator.clipboard.writeText(link)
      setInviteState('copied')
    } catch {
      setInviteState('error')
    } finally {
      setTimeout(() => setInviteState('idle'), 2000)
    }
  }, [roomId, isGm])

  const tokenImageInputRef = useRef<HTMLInputElement>(null)
  const pendingTokenIdRef = useRef<string | null>(null)

  const handleChangeTokenImage = useCallback((tokenId: string) => {
    pendingTokenIdRef.current = tokenId
    tokenImageInputRef.current?.click()
  }, [])

  const tokenList = useMemo(() => Object.values(tokens), [tokens])
  const selectedName = selectedTokenId ? (tokens[selectedTokenId]?.name ?? null) : null

  const remoteSelections = useMemo(
    () =>
      peers
        .filter((p) => !p.isLocal && p.selectedTokenId !== null)
        .map((p) => ({ tokenId: p.selectedTokenId as string, color: p.color })),
    [peers],
  )

  // Modo demo (sem Supabase): o mapa mora só neste navegador, via IndexedDB.
  // Com Supabase, quem manda é a URL compartilhada no doc da sala.
  useEffect(() => {
    if (isSupabaseConfigured) return
    let cancelled = false
    void loadLocalAsset(sceneMapKey(roomId)).then((blob) => {
      if (blob && !cancelled) setMapUri(URL.createObjectURL(blob))
    })
    return () => {
      cancelled = true
    }
  }, [roomId, setMapUri])

  const handleBoardEvent = useCallback(
    (event: BoardEvent) => {
      switch (event.type) {
        case 'token-moved':
          moveToken(event.tokenId, event.x, event.y)
          break
        case 'token-selected':
          selectToken(event.tokenId)
          break
        case 'token-activated': {
          const state = useBoardStore.getState()
          const token = state.tokens[event.tokenId]
          if (!token) break
          if (token.actorId && state.actors[token.actorId]) {
            state.openSheet(token.actorId, token.id)
          } else {
            const actor = actorSchema.parse({
              id: crypto.randomUUID(),
              campaignId: roomId,
              name: token.name,
              kind: 'npc',
              systemId: ordemParanormalSystem.id,
              systemData: ordemParanormalSystem.createDefaultActorData(),
            })
            state.createActor(actor)
            state.setTokenActor(token.id, actor.id)
            state.openSheet(actor.id, token.id)
          }
          break
        }
        case 'viewport-changed':
          setZoom(event.scale)
          break
      }
    },
    [moveToken, selectToken, roomId],
  )

  /**
   * Sobe a imagem para o Storage e devolve a URL que todos conseguem carregar.
   * Sem Supabase (modo demo) cai no blob local, que só vale neste navegador.
   */
  const publishImage = useCallback(
    async (file: File): Promise<string | null> => {
      if (!isSupabaseConfigured) return URL.createObjectURL(file)
      setUploading(true)
      setUploadError(null)
      try {
        return await uploadAsset(file, roomId)
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : 'Não foi possível enviar a imagem.',
        )
        return null
      } finally {
        setUploading(false)
      }
    },
    [roomId],
  )

  const handlePickMap = useCallback(
    async (file: File) => {
      const url = await publishImage(file)
      if (!url) return
      // Sem Supabase, guardamos localmente para o mapa sobreviver ao F5.
      if (!isSupabaseConfigured) void saveLocalAsset(sceneMapKey(roomId), file)
      setMapUri(url)
    },
    [roomId, setMapUri, publishImage],
  )

  const handleRemoveMap = useCallback(() => {
    void deleteLocalAsset(sceneMapKey(roomId))
    setMapUri(null)
  }, [roomId, setMapUri])

  const handlePickToken = useCallback(
    async (file: File) => {
      const url = await publishImage(file)
      if (!url) return
      const grid = demoScene.grid
      const center = snapToCellCenter(demoScene.width / 2, demoScene.height / 2, {
        size: grid.size,
        offsetX: grid.offsetX,
        offsetY: grid.offsetY,
      })
      addToken(
        tokenSchema.parse({
          id: crypto.randomUUID(),
          name: fileBaseName(file),
          imageUri: url,
          ...center,
        }),
      )
    },
    [addToken, publishImage],
  )

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Tabuleiro */}
      <div className="relative flex-1">
        <BoardCanvas
          scene={demoScene}
          tokens={tokenList}
          mapUri={mapUri}
          remoteSelections={remoteSelections}
          onEvent={handleBoardEvent}
        />

        <SyncWarning />

        {/* Envio de imagem em andamento / falhou */}
        {(uploading || uploadError) && (
          <div className="pointer-events-none absolute left-1/2 top-16 z-20 -translate-x-1/2">
            {uploading ? (
              <span className="rounded-full bg-zinc-900/90 px-4 py-1.5 text-xs font-semibold text-zinc-300 shadow backdrop-blur">
                📤 Enviando imagem…
              </span>
            ) : (
              <span className="pointer-events-auto rounded-full bg-red-950/90 px-4 py-1.5 text-xs font-semibold text-red-200 shadow backdrop-blur">
                {uploadError}
              </span>
            )}
          </div>
        )}

        <PresenceBar peers={peers} onRename={setDisplayName} />

        <BoardToolbar
          hasMap={mapUri !== null}
          isGm={isGm}
          onPickMap={handlePickMap}
          onRemoveMap={handleRemoveMap}
          onPickToken={handlePickToken}
          onOpenGmScreen={() => setGmScreenOpen(true)}
        />

        {/* Banner de preparação (mestre) */}
        {isGm && phase === 'prep' && (
          <div className="pointer-events-none absolute left-1/2 top-16 flex -translate-x-1/2 items-center gap-3 rounded-full border border-amber-800/50 bg-amber-950/80 px-4 py-1.5 shadow backdrop-blur">
            <span className="text-xs font-semibold text-amber-200">
              🔧 Mesa em preparação — os jogadores aguardam no lounge
            </span>
            <button
              type="button"
              onClick={() => setPhase('live')}
              className="pointer-events-auto rounded-full bg-amber-600 px-3 py-1 text-xs font-bold text-amber-950 transition-colors hover:bg-amber-500"
            >
              ▶ Iniciar sessão
            </button>
          </div>
        )}

        <div className="pointer-events-none absolute left-4 top-4 rounded-lg bg-zinc-900/80 px-4 py-3 shadow-lg backdrop-blur">
          <div className="flex items-center gap-2">
            <Link
              to="/"
              title="Voltar ao lobby"
              className="pointer-events-auto rounded px-1 text-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            >
              ←
            </Link>
            <h1 className="text-sm font-semibold">{campaignName}</h1>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            {selectedName ? `Selecionado: ${selectedName}` : 'Nenhum token selecionado'}
            {zoom !== null && ` · zoom ${Math.round(zoom * 100)}%`}
          </p>
          <p className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
            <span>{CONNECTION_LABEL[connection]}</span>
            <button
              type="button"
              onClick={() => void copyInviteLink()}
              disabled={inviteState === 'loading'}
              className="pointer-events-auto rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
              title={
                isGm
                  ? 'Copia um link que já entra na mesa — basta mandar para os jogadores'
                  : 'Copiar o link desta mesa'
              }
            >
              {inviteState === 'copied'
                ? 'Copiado!'
                : inviteState === 'error'
                  ? 'Erro ao gerar'
                  : inviteState === 'loading'
                    ? '…'
                    : isGm
                      ? '🎟️ Copiar convite'
                      : 'Copiar link'}
            </button>
          </p>
          {isGm && (
            <p className="mt-1.5 flex items-center gap-2 border-t border-zinc-800 pt-1.5 text-[10px]">
              {phase === 'live' && (
                <button
                  type="button"
                  onClick={() => setPhase('prep')}
                  title="Jogadores voltam pro lounge enquanto você ajusta a mesa"
                  className="pointer-events-auto rounded bg-zinc-800 px-1.5 py-0.5 font-semibold text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
                >
                  ⏸ Voltar à preparação
                </button>
              )}
              {isSupabaseConfigured && (
                <button
                  type="button"
                  onClick={() => setEndModalOpen(true)}
                  className="pointer-events-auto rounded px-1.5 py-0.5 font-semibold text-red-400/70 transition-colors hover:bg-red-950/60 hover:text-red-300"
                >
                  Encerrar mesa…
                </button>
              )}
            </p>
          )}
        </div>

        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900/80 px-4 py-1.5 text-xs text-zinc-400 shadow backdrop-blur">
          Arraste tokens · botão direito move a câmera · scroll dá zoom · duplo clique abre a ficha
        </div>

        {/* input oculto: troca de imagem de token (botão na ficha) */}
        <input
          ref={tokenImageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            const tokenId = pendingTokenIdRef.current
            pendingTokenIdRef.current = null
            e.target.value = ''
            if (file && tokenId) {
              void publishImage(file).then((url) => {
                if (url) setTokenImage(tokenId, url)
              })
            }
          }}
        />
      </div>

      {/* Escudo do Mestre */}
      {isGm && gmScreenOpen && <GmScreen roomId={roomId} onClose={() => setGmScreenOpen(false)} />}

      {/* Ficha aberta (janela flutuante) */}
      <OpSheetWindow onChangeTokenImage={handleChangeTokenImage} />

      {/* Encerramento permanente */}
      {endModalOpen && (
        <EndCampaignModal
          roomId={roomId}
          campaignName={campaignName}
          onCancel={() => setEndModalOpen(false)}
        />
      )}

      {/* Chat + dados */}
      <ChatPanel />
    </main>
  )
}

import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  actorSchema,
  computeDerived,
  opActorDataSchema,
  ordemParanormalSystem,
  type Actor,
} from '@/core'
import { currentUserId, useBoardStore } from '@/app/store'
import { SyncWarning } from '@/ui/board/SyncWarning'
import { ChatPanel } from '@/ui/chat/ChatPanel'
import { OpSheetWindow } from '@/ui/sheets/ordem-paranormal/OpSheet'

// Sala de espera do jogador: chat, quem chegou, e as SUAS fichas — tudo antes
// de ver qualquer mapa. O tabuleiro aparece quando o mestre inicia a sessão.

function ActorCard({ actor, onOpen }: { actor: Actor; onOpen(): void }) {
  const summary = useMemo(() => {
    const parsed = opActorDataSchema.safeParse(actor.systemData)
    if (!parsed.success) return null
    const derived = computeDerived(parsed.data)
    return { nex: parsed.data.nex, cls: parsed.data.class, pv: parsed.data.resources.pv, pvMax: derived.pvMax }
  }, [actor.systemData])

  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-left transition-colors hover:border-zinc-600"
    >
      <p className="font-semibold text-zinc-100">{actor.name}</p>
      {summary ? (
        <p className="mt-0.5 text-xs text-zinc-500">
          {summary.cls} · NEX {summary.nex}% · PV {summary.pv}/{summary.pvMax}
        </p>
      ) : (
        <p className="mt-0.5 text-xs text-red-400">ficha incompatível</p>
      )}
    </button>
  )
}

export function LoungeView({ roomId, campaignName }: { roomId: string; campaignName: string }) {
  const actors = useBoardStore((s) => s.actors)
  const peers = useBoardStore((s) => s.peers)
  const connection = useBoardStore((s) => s.connection)
  const stalled = useBoardStore((s) => s.syncStalled)
  const createActor = useBoardStore((s) => s.createActor)
  const openSheet = useBoardStore((s) => s.openSheet)
  const importInputRef = useRef<HTMLInputElement>(null)

  const myId = currentUserId()
  const myActors = useMemo(
    () => Object.values(actors).filter((a) => a.ownerId === myId),
    [actors, myId],
  )

  function handleCreate() {
    const actor = actorSchema.parse({
      id: crypto.randomUUID(),
      campaignId: roomId,
      name: 'Novo agente',
      kind: 'character',
      systemId: ordemParanormalSystem.id,
      systemData: ordemParanormalSystem.createDefaultActorData(),
      ownerId: myId,
    })
    createActor(actor)
    openSheet(actor.id)
  }

  async function handleImport(file: File) {
    try {
      const raw = JSON.parse(await file.text()) as Record<string, unknown>
      const actor = actorSchema.parse({
        ...raw,
        id: crypto.randomUUID(),
        campaignId: roomId,
        ownerId: myId,
      })
      createActor(actor)
      openSheet(actor.id)
    } catch {
      alert('Esse arquivo não parece uma ficha exportada válida.')
    }
  }

  return (
    <main className="relative flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <SyncWarning />
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* topo */}
        <header className="border-b border-zinc-800/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <Link to="/" title="Voltar ao lobby" className="text-zinc-500 hover:text-zinc-200">
              ←
            </Link>
            <div>
              <h1 className="text-lg font-bold">{campaignName}</h1>
              <p className="text-xs text-zinc-500">
                Sala de espera ·{' '}
                {stalled ? (
                  <span className="font-semibold text-red-400">
                    sem conexão com o servidor da mesa
                  </span>
                ) : connection === 'connected' ? (
                  <span className="text-amber-400">aguardando o mestre iniciar a sessão…</span>
                ) : (
                  'conectando…'
                )}
              </p>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-6">
          {/* quem chegou */}
          <section className="mb-8">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
              Na mesa
            </h2>
            <div className="flex flex-wrap gap-2">
              {peers.map((p) => (
                <span
                  key={p.clientId}
                  className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1 text-sm"
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                  <span className={p.isLocal ? 'font-semibold text-zinc-100' : 'text-zinc-300'}>
                    {p.name}
                    {p.isLocal && ' (você)'}
                  </span>
                </span>
              ))}
            </div>
          </section>

          {/* minhas fichas */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Minhas fichas
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                  className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  ⬆️ Importar ficha
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  className="rounded-md bg-cyan-700 px-3 py-1 text-xs font-bold text-white hover:bg-cyan-600"
                >
                  + Criar ficha
                </button>
              </div>
            </div>

            {myActors.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
                <p className="text-sm text-zinc-400">Você ainda não tem ficha nesta mesa.</p>
                <p className="mt-1 text-xs text-zinc-600">
                  Crie uma agora e chegue pronto quando o mestre abrir o tabuleiro.
                </p>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {myActors.map((a) => (
                  <ActorCard key={a.id} actor={a} onOpen={() => openSheet(a.id)} />
                ))}
              </div>
            )}
          </section>
        </div>

        <input
          ref={importInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleImport(file)
            e.target.value = ''
          }}
        />
      </div>

      {/* Ficha aberta */}
      <OpSheetWindow onChangeTokenImage={() => {}} />

      {/* Chat da mesa (o mesmo da sessão) */}
      <ChatPanel />
    </main>
  )
}

import { useMemo } from 'react'
import {
  actorSchema,
  opActorDataSchema,
  ordemParanormalSystem,
} from '@/core'
import { currentUserId, useBoardStore } from '@/app/store'
import { SheetWindow } from '@/ui/sheets/SheetWindow'

// Escudo do Mestre: bestiário secreto da mesa. Vive num doc Yjs separado que
// só o cliente do GM conecta — jogadores não recebem NADA daqui até o mestre
// clicar em "Revelar".

interface GmScreenProps {
  roomId: string
  onClose(): void
}

export function GmScreen({ roomId, onClose }: GmScreenProps) {
  const gmActors = useBoardStore((s) => s.gmActors)
  const createGmActor = useBoardStore((s) => s.createGmActor)
  const revealGmActor = useBoardStore((s) => s.revealGmActor)
  const openSheet = useBoardStore((s) => s.openSheet)

  const creatures = useMemo(
    () => Object.values(gmActors).sort((a, b) => a.name.localeCompare(b.name)),
    [gmActors],
  )

  function handleCreate() {
    const actor = actorSchema.parse({
      id: crypto.randomUUID(),
      campaignId: roomId,
      name: 'Nova criatura',
      kind: 'creature',
      systemId: ordemParanormalSystem.id,
      systemData: ordemParanormalSystem.createDefaultActorData(),
      ownerId: currentUserId(),
    })
    createGmActor(actor)
    openSheet(actor.id)
  }

  return (
    <SheetWindow title="🛡️ Escudo do Mestre" onClose={onClose}>
      <div className="flex flex-col gap-3 p-4">
        <p className="text-xs leading-5 text-zinc-500">
          Só você vê o que está aqui — o conteúdo do escudo nem chega aos navegadores dos
          jogadores. <strong className="text-zinc-400">Revelar</strong> move a criatura para a
          mesa, à vista de todos.
        </p>

        {creatures.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center">
            <p className="text-sm text-zinc-400">O bestiário está vazio.</p>
            <p className="mt-1 text-xs text-zinc-600">
              Crie criaturas e prepare a sessão sem estragar a surpresa.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {creatures.map((actor) => {
              const ok = opActorDataSchema.safeParse(actor.systemData).success
              return (
                <li
                  key={actor.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-100">{actor.name}</p>
                    {!ok && <p className="text-[10px] text-red-400">ficha incompatível</p>}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => openSheet(actor.id)}
                      className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                    >
                      📋 Ficha
                    </button>
                    <button
                      type="button"
                      title="Mover para a mesa — todos os jogadores passam a ver"
                      onClick={() => revealGmActor(actor.id)}
                      className="rounded-md bg-red-900/60 px-2.5 py-1 text-xs font-bold text-red-200 hover:bg-red-800/70"
                    >
                      👁 Revelar
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <button
          type="button"
          onClick={handleCreate}
          className="self-start rounded-md bg-cyan-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-600"
        >
          + Nova criatura
        </button>
      </div>
    </SheetWindow>
  )
}

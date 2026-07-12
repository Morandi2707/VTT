import { useState } from 'react'
import type { PeerPresence } from '@/sync'

// Quem está na sala: chip colorido por pessoa; o próprio nome é editável
// (clica no lápis, Enter confirma). Identidade real chega com a Fase 2.

interface PresenceBarProps {
  peers: PeerPresence[]
  onRename(name: string): void
}

function LocalChip({ peer, onRename }: { peer: PeerPresence; onRename(name: string): void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(peer.name)

  function commit() {
    setEditing(false)
    if (draft.trim() && draft.trim() !== peer.name) onRename(draft)
  }

  if (editing) {
    return (
      <form
        className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-zinc-900/80 py-1 pl-2 pr-1 shadow backdrop-blur"
        onSubmit={(e) => {
          e.preventDefault()
          commit()
        }}
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: peer.color }} />
        <input
          autoFocus
          value={draft}
          maxLength={24}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
          className="w-24 bg-transparent text-xs font-semibold text-zinc-100 focus:outline-none"
          aria-label="Seu apelido na mesa"
        />
      </form>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(peer.name)
        setEditing(true)
      }}
      title="Clique para mudar seu apelido"
      className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-zinc-900/80 px-2.5 py-1 shadow backdrop-blur transition-colors hover:bg-zinc-800"
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: peer.color }} />
      <span className="text-xs font-semibold text-zinc-100">{peer.name}</span>
      <span className="text-[10px] text-zinc-500">✎</span>
    </button>
  )
}

export function PresenceBar({ peers, onRename }: PresenceBarProps) {
  const local = peers.find((p) => p.isLocal)
  const others = peers.filter((p) => !p.isLocal)

  return (
    <div className="pointer-events-none absolute right-4 top-4 flex max-w-[50%] flex-wrap items-center justify-end gap-1.5">
      {local && <LocalChip peer={local} onRename={onRename} />}
      {others.map((peer) => (
        <span
          key={peer.clientId}
          className="flex items-center gap-1.5 rounded-full bg-zinc-900/80 px-2.5 py-1 shadow backdrop-blur"
          title={`${peer.name} está na sala`}
        >
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: peer.color }} />
          <span className="text-xs font-medium text-zinc-300">{peer.name}</span>
        </span>
      ))}
      {others.length === 0 && (
        <span className="rounded-full bg-zinc-900/60 px-2.5 py-1 text-[10px] text-zinc-500 shadow backdrop-blur">
          só você na sala
        </span>
      )}
    </div>
  )
}

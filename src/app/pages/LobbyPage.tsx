import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/app/authStore'
import {
  createCampaign,
  joinCampaignByCode,
  listMyCampaigns,
  type CampaignSummary,
} from '@/data/campaigns'

// Lobby: as mesas do usuário, criação de mesa nova e entrada por convite.

function CampaignCard({ campaign }: { campaign: CampaignSummary }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-zinc-100">{campaign.name}</h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              campaign.role === 'gm'
                ? 'bg-red-900/40 text-red-300'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            {campaign.role === 'gm' ? 'Mestre' : 'Jogador'}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">Ordem Paranormal</p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Link
          to={`/mesa/${campaign.id}`}
          className="flex-1 rounded-lg bg-cyan-700 py-1.5 text-center text-sm font-bold text-white transition-colors hover:bg-cyan-600"
        >
          Entrar na mesa
        </Link>
        {campaign.role === 'gm' && campaign.inviteCode && (
          <button
            type="button"
            title="Copiar código de convite para os jogadores"
            onClick={() => {
              void navigator.clipboard.writeText(campaign.inviteCode ?? '').then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              })
            }}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 font-mono text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-700"
          >
            {copied ? 'Copiado!' : campaign.inviteCode}
          </button>
        )}
      </div>
    </div>
  )
}

export function LobbyPage() {
  const status = useAuthStore((s) => s.status)
  const displayName = useAuthStore((s) => s.displayName)
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()

  const [campaigns, setCampaigns] = useState<CampaignSummary[] | null>(null)
  const [newName, setNewName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    listMyCampaigns()
      .then(setCampaigns)
      .catch((e: Error) => setError(e.message))
  }, [])

  useEffect(() => {
    if (status === 'signedIn') refresh()
  }, [status, refresh])

  if (status === 'unconfigured') return <Navigate to="/mesa/demo" replace />
  if (status === 'signedOut') return <Navigate to="/login" replace />

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (busy || !newName.trim()) return
    setBusy(true)
    setError(null)
    try {
      const id = await createCampaign(newName)
      navigate(`/mesa/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a mesa.')
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    if (busy || !joinCode.trim()) return
    setBusy(true)
    setError(null)
    try {
      const id = await joinCampaignByCode(joinCode)
      navigate(`/mesa/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar na mesa.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-black tracking-tight">🎲 VTT</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-zinc-400">{displayName ?? '…'}</span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-md px-2 py-1 text-xs font-semibold text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* ações */}
        <div className="mb-8 grid gap-3 sm:grid-cols-2">
          <form
            onSubmit={handleCreate}
            className="flex gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"
          >
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome da nova mesa (ex.: O Segredo na Floresta)"
              maxLength={60}
              className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !newName.trim()}
              className="shrink-0 rounded-lg bg-red-800 px-4 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
            >
              Criar mesa
            </button>
          </form>

          <form
            onSubmit={handleJoin}
            className="flex gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"
          >
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Código de convite (ex.: a1b2c3d4)"
              maxLength={16}
              className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:font-sans placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !joinCode.trim()}
              className="shrink-0 rounded-lg bg-cyan-700 px-4 text-sm font-bold text-white transition-colors hover:bg-cyan-600 disabled:opacity-40"
            >
              Entrar
            </button>
          </form>
        </div>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        {/* mesas */}
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-500">
          Minhas mesas
        </h2>
        {campaigns === null ? (
          <p className="text-sm text-zinc-600">Carregando…</p>
        ) : campaigns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center">
            <p className="text-zinc-400">Nenhuma mesa ainda.</p>
            <p className="mt-1 text-sm text-zinc-600">
              Crie a primeira acima, ou entre numa mesa existente com o código do seu mestre.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/app/authStore'

// Destino do link de recuperação enviado por e-mail. O Supabase autentica o
// usuário automaticamente pelo token da URL; aqui ele só define a senha nova.

export function ResetPasswordPage() {
  const status = useAuthStore((s) => s.status)
  const error = useAuthStore((s) => s.error)
  const updatePassword = useAuthStore((s) => s.updatePassword)
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [mismatch, setMismatch] = useState(false)

  if (status === 'unconfigured') return <Navigate to="/mesa/demo" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setMismatch(false)
    if (password !== confirm) {
      setMismatch(true)
      return
    }
    setBusy(true)
    try {
      if (await updatePassword(password)) {
        navigate('/', { replace: true })
      }
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-700 focus:outline-none focus:ring-1 focus:ring-cyan-700/50'

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <header className="mb-6 text-center">
          <p className="text-3xl">🔑</p>
          <h1 className="mt-2 text-xl font-black tracking-tight text-zinc-50">
            Criar senha nova
          </h1>
        </header>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-2xl">
          {status === 'loading' && <p className="text-sm text-zinc-500">Verificando o link…</p>}

          {status === 'signedOut' && (
            <div className="text-center">
              <p className="text-sm text-zinc-400">
                Este link de redefinição é inválido ou já expirou.
              </p>
              <Link
                to="/login"
                className="mt-3 inline-block text-sm font-semibold text-cyan-400 hover:text-cyan-300"
              >
                Pedir um link novo
              </Link>
            </div>
          )}

          {status === 'signedIn' && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nova senha (mín. 6 caracteres)"
                required
                minLength={6}
                autoComplete="new-password"
                className={inputClass}
                aria-label="Nova senha"
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repete a senha nova"
                required
                minLength={6}
                autoComplete="new-password"
                className={inputClass}
                aria-label="Confirmar nova senha"
              />
              {mismatch && <p className="text-xs text-red-400">As senhas não coincidem.</p>}
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="mt-1 rounded-lg bg-cyan-700 py-2.5 text-sm font-bold text-white transition-colors hover:bg-cyan-600 disabled:opacity-50"
              >
                {busy ? 'Salvando…' : 'Salvar e entrar'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}

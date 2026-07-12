import { useState, type FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/app/authStore'

// Porta de entrada da plataforma. Login e cadastro com e-mail/senha.

type Mode = 'signin' | 'signup'

export function LoginPage() {
  const status = useAuthStore((s) => s.status)
  const error = useAuthStore((s) => s.error)
  const signIn = useAuthStore((s) => s.signIn)
  const signUp = useAuthStore((s) => s.signUp)
  const clearError = useAuthStore((s) => s.clearError)

  const [params] = useSearchParams()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const next = params.get('next') ?? '/'

  if (status === 'signedIn') return <Navigate to={next} replace />
  if (status === 'unconfigured') return <Navigate to="/mesa/demo" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setNotice(null)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
      } else {
        const result = await signUp(email, password, displayName)
        if (result === 'confirm-email') {
          setNotice('Cadastro criado! Confira seu e-mail para confirmar a conta antes de entrar.')
          setMode('signin')
        }
      }
    } finally {
      setBusy(false)
    }
  }

  function switchMode(next: Mode) {
    setMode(next)
    setNotice(null)
    clearError()
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-700 focus:outline-none focus:ring-1 focus:ring-cyan-700/50'

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4">
      {/* fundo ambiente */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-red-900/10 blur-3xl" />
        <div className="absolute -right-40 bottom-1/4 h-96 w-96 rounded-full bg-cyan-900/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        <header className="mb-8 text-center">
          <p className="text-3xl">🎲</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-50">VTT</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Sua mesa de Ordem Paranormal, em qualquer lugar.
          </p>
        </header>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-925 bg-zinc-900/40 p-6 shadow-2xl backdrop-blur">
          {/* alternador login/cadastro */}
          <div className="mb-5 grid grid-cols-2 rounded-lg bg-zinc-900 p-1">
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`rounded-md py-1.5 text-sm font-semibold transition-colors ${
                  mode === m ? 'bg-zinc-700 text-zinc-50' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {m === 'signin' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === 'signup' && (
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Como a mesa vai te chamar (ex.: Eduardo)"
                maxLength={24}
                required
                className={inputClass}
                aria-label="Nome de exibição"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoComplete="email"
              className={inputClass}
              aria-label="E-mail"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Senha (mín. 6 caracteres)' : 'Senha'}
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              className={inputClass}
              aria-label="Senha"
            />

            {error && <p className="text-xs text-red-400">{error}</p>}
            {notice && <p className="text-xs text-emerald-400">{notice}</p>}

            <button
              type="submit"
              disabled={busy || status === 'loading'}
              className="mt-1 rounded-lg bg-cyan-700 py-2.5 text-sm font-bold text-white transition-colors hover:bg-cyan-600 disabled:opacity-50"
            >
              {busy ? 'Um instante…' : mode === 'signin' ? 'Entrar na Ordem' : 'Criar minha conta'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Feito para mesas de RPG brasileiras · beta
        </p>
      </div>
    </main>
  )
}

import { create } from 'zustand'
import { isSupabaseConfigured, supabase } from '@/data/supabase'

// Sessão do usuário (Supabase Auth) + perfil (display_name).
// status 'unconfigured' = modo local sem contas (Supabase não configurado).

export type AuthStatus = 'loading' | 'unconfigured' | 'signedOut' | 'signedIn'

interface AuthState {
  status: AuthStatus
  userId: string | null
  email: string | null
  displayName: string | null
  /** Erro da última tentativa de login/cadastro (mostrado no formulário). */
  error: string | null
  signIn(email: string, password: string): Promise<boolean>
  signUp(email: string, password: string, displayName: string): Promise<'ok' | 'confirm-email' | 'error'>
  signOut(): Promise<void>
  updateDisplayName(name: string): Promise<void>
  clearError(): void
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (m.includes('already registered')) return 'Este e-mail já tem cadastro — faça login.'
  if (m.includes('password should be at least')) return 'A senha precisa de pelo menos 6 caracteres.'
  if (m.includes('valid email')) return 'Digite um e-mail válido.'
  if (m.includes('rate limit')) return 'Muitas tentativas — aguarde um instante.'
  return message
}

async function loadProfileName(userId: string): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .maybeSingle()
  return data?.display_name ?? null
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: isSupabaseConfigured ? 'loading' : 'unconfigured',
  userId: null,
  email: null,
  displayName: null,
  error: null,

  clearError: () => set({ error: null }),

  signIn: async (email, password) => {
    if (!supabase) return false
    set({ error: null })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ error: translateAuthError(error.message) })
      return false
    }
    return true
  },

  signUp: async (email, password, displayName) => {
    if (!supabase) return 'error'
    set({ error: null })
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName.trim().slice(0, 24) } },
    })
    if (error) {
      set({ error: translateAuthError(error.message) })
      return 'error'
    }
    // E-mail já cadastrado: o Supabase devolve user sem identities.
    if (data.user && data.user.identities?.length === 0) {
      set({ error: 'Este e-mail já tem cadastro — faça login.' })
      return 'error'
    }
    return data.session ? 'ok' : 'confirm-email'
  },

  signOut: async () => {
    await supabase?.auth.signOut()
  },

  updateDisplayName: async (name) => {
    const trimmed = name.trim().slice(0, 24)
    const { userId } = get()
    if (!supabase || !userId || !trimmed) return
    set({ displayName: trimmed })
    await supabase.from('profiles').update({ display_name: trimmed }).eq('id', userId)
  },
}))

// Observa a sessão do Supabase e espelha no store.
if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      useAuthStore.setState({ status: 'signedOut', userId: null, email: null, displayName: null })
      return
    }
    const userId = session.user.id
    const metaName = (session.user.user_metadata?.display_name as string | undefined) ?? null
    useAuthStore.setState({
      status: 'signedIn',
      userId,
      email: session.user.email ?? null,
      displayName: metaName,
    })
    // Nome oficial vem do perfil (fonte da verdade no Postgres).
    void loadProfileName(userId).then((name) => {
      if (name && useAuthStore.getState().userId === userId) {
        useAuthStore.setState({ displayName: name })
      }
    })
  })
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Cliente Supabase (Auth + Postgres/RLS). Enquanto as envs não existirem,
// o app roda em "modo local" sem contas (útil em dev — ver SUPABASE.md).

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null

export const isSupabaseConfigured = supabase !== null

import { supabase } from './supabase'

// Repositório de campanhas/mesas (Postgres + RLS + RPCs security definer).

export interface CampaignSummary {
  id: string
  name: string
  systemId: string
  role: 'gm' | 'player'
  inviteCode: string | null // só o GM enxerga o código
  gmId: string
}

interface MembershipRow {
  role: 'gm' | 'player'
  campaigns: {
    id: string
    name: string
    system_id: string
    invite_code: string | null
    gm_id: string
  } | null
}

export async function listMyCampaigns(): Promise<CampaignSummary[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('campaign_members')
    .select('role, campaigns(id, name, system_id, invite_code, gm_id)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as MembershipRow[])
    .filter((row) => row.campaigns !== null)
    .map((row) => ({
      id: row.campaigns!.id,
      name: row.campaigns!.name,
      systemId: row.campaigns!.system_id,
      role: row.role,
      inviteCode: row.campaigns!.invite_code,
      gmId: row.campaigns!.gm_id,
    }))
}

export async function createCampaign(name: string): Promise<string> {
  if (!supabase) throw new Error('Supabase não configurado')
  const { data, error } = await supabase.rpc('create_campaign', { p_name: name.trim() })
  if (error) throw new Error(error.message)
  return data as string
}

export async function joinCampaignByCode(code: string): Promise<string> {
  if (!supabase) throw new Error('Supabase não configurado')
  const { data, error } = await supabase.rpc('join_campaign_by_code', {
    p_code: code.trim().toLowerCase(),
  })
  if (error) {
    throw new Error(
      error.message.includes('inválido') ? 'Código de convite inválido.' : error.message,
    )
  }
  return data as string
}

/** Encerramento permanente: apaga a campanha e todos os vínculos (só o GM). */
export async function deleteCampaign(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado')
  const { error } = await supabase.rpc('delete_campaign', { p_campaign_id: id })
  if (error) throw new Error(error.message)
}

export async function getCampaign(
  id: string,
): Promise<{ id: string; name: string; inviteCode: string | null; gmId: string } | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, name, invite_code, gm_id')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? { id: data.id, name: data.name, inviteCode: data.invite_code, gmId: data.gm_id } : null
}

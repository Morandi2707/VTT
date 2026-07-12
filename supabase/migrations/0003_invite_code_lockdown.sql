-- Blindagem do código de convite: nenhum select direto na coluna — só o GM,
-- via RPC. Corrige o vazamento em que qualquer membro recebia o invite_code.
-- Rodar no SQL Editor do Supabase.

-- Remove o acesso amplo à tabela e re-concede SEM a coluna invite_code.
revoke select on public.campaigns from authenticated;
revoke select on public.campaigns from anon;
grant select (id, name, system_id, gm_id, created_at) on public.campaigns to authenticated;

-- O GM pega o código por esta função (verifica a posse da mesa).
create or replace function public.get_invite_code(p_campaign_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare code text;
begin
  select invite_code into code
  from campaigns
  where id = p_campaign_id and gm_id = auth.uid();
  if code is null then
    raise exception 'apenas o mestre vê o código de convite';
  end if;
  return code;
end $$;

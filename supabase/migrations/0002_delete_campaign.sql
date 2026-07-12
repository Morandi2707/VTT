-- Encerramento permanente de mesa: apenas o GM, apaga campanha + membros (cascade).
-- Rodar no SQL Editor do Supabase.

create or replace function public.delete_campaign(p_campaign_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  delete from campaigns where id = p_campaign_id and gm_id = auth.uid();
  if not found then
    raise exception 'apenas o mestre pode encerrar a mesa';
  end if;
end $$;

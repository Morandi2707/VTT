-- VTT — schema inicial: perfis, campanhas e membros, com RLS estrito.
-- Rodar no SQL Editor do Supabase (ver SUPABASE.md).

-- ── Perfis ───────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default 'Agente',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "perfis são visíveis para autenticados"
  on public.profiles for select to authenticated using (true);

create policy "cada um edita o próprio perfil"
  on public.profiles for update to authenticated using (auth.uid() = id);

-- Cria o perfil automaticamente no cadastro (nome vem do formulário).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), 'Agente ' || substr(new.id::text, 1, 4))
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Campanhas e membros ──────────────────────────────────────────────────────

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  system_id text not null default 'ordem-paranormal',
  gm_id uuid not null references public.profiles(id),
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  created_at timestamptz not null default now()
);

create table public.campaign_members (
  campaign_id uuid not null references public.campaigns on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  role text not null check (role in ('gm', 'player')),
  created_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;

-- security definer para evitar recursão de RLS entre as duas tabelas.
create or replace function public.is_campaign_member(c_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from campaign_members
    where campaign_id = c_id and user_id = auth.uid()
  );
$$;

create policy "membros veem a campanha"
  on public.campaigns for select to authenticated
  using (public.is_campaign_member(id) or gm_id = auth.uid());

create policy "membros veem quem participa"
  on public.campaign_members for select to authenticated
  using (public.is_campaign_member(campaign_id));

-- Escritas passam SEMPRE pelas RPCs (security definer) abaixo — sem policy
-- de insert/update/delete direto, o cliente não consegue burlar.

create or replace function public.create_campaign(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  insert into campaigns (name, gm_id) values (trim(p_name), auth.uid()) returning id into cid;
  insert into campaign_members (campaign_id, user_id, role) values (cid, auth.uid(), 'gm');
  return cid;
end $$;

create or replace function public.join_campaign_by_code(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  select id into cid from campaigns where invite_code = lower(trim(p_code));
  if cid is null then
    raise exception 'código de convite inválido';
  end if;
  insert into campaign_members (campaign_id, user_id, role)
  values (cid, auth.uid(), 'player')
  on conflict (campaign_id, user_id) do nothing;
  return cid;
end $$;

-- Armazenamento de imagens (mapas e artes de token).
-- Sem isso, cada navegador só enxerga as próprias imagens: o link `blob:`
-- gerado localmente não existe na máquina dos outros jogadores.
-- Rodar no SQL Editor do Supabase.

insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

-- Leitura pública: o canvas (PixiJS) e o <img> precisam baixar direto, sem
-- cabeçalho de autenticação. Os caminhos usam UUID aleatório, então não são
-- adivinháveis — proteção adequada para o beta.
drop policy if exists "assets: leitura publica" on storage.objects;
create policy "assets: leitura publica"
  on storage.objects for select
  using (bucket_id = 'assets');

-- Só quem tem conta envia arquivos.
drop policy if exists "assets: upload autenticado" on storage.objects;
create policy "assets: upload autenticado"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'assets');

-- Cada um só apaga o que enviou.
drop policy if exists "assets: dono apaga" on storage.objects;
create policy "assets: dono apaga"
  on storage.objects for delete to authenticated
  using (bucket_id = 'assets' and owner = auth.uid());

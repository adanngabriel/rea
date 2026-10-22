-- =====================================================================
-- Segurança: Row Level Security, Storage e Realtime
--
-- Regra geral: o público (anon) e usuários autenticados que não estão em
-- public.admins só podem LER o conteúdo publicado. Toda escrita exige
-- public.is_admin(), verificada no banco — o app também verifica no
-- servidor, mas o banco é a última barreira.
-- =====================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'admins', 'site_settings', 'tournaments', 'editions', 'rounds', 'teams', 'players',
    'player_admin_notes', 'registrations', 'matches', 'match_events', 'match_lineups',
    'suspensions', 'awards', 'news', 'press_links', 'documents', 'gallery_albums',
    'gallery_items', 'sponsors', 'audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    -- Administradores podem tudo.
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t || '_admin_all', t
    );
  end loop;

  -- Leitura pública irrestrita (dados esportivos e estruturais).
  foreach t in array array[
    'site_settings', 'tournaments', 'editions', 'rounds', 'teams', 'players',
    'registrations', 'matches', 'match_events', 'match_lineups', 'suspensions',
    'awards', 'press_links', 'gallery_items'
  ] loop
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      t || '_public_read', t
    );
  end loop;
end;
$$;

-- Leitura pública condicionada à publicação.
create policy news_public_read on public.news for select to anon, authenticated
  using (status = 'published' and published_at <= now());
create policy documents_public_read on public.documents for select to anon, authenticated
  using (is_published);
create policy gallery_albums_public_read on public.gallery_albums for select to anon, authenticated
  using (is_published);
create policy sponsors_public_read on public.sponsors for select to anon, authenticated
  using (active);

-- Itens de álbuns não publicados ficam ocultos.
drop policy gallery_items_public_read on public.gallery_items;
create policy gallery_items_public_read on public.gallery_items for select to anon, authenticated
  using (exists (
    select 1 from public.gallery_albums a where a.id = album_id and a.is_published
  ));

-- O público nunca escreve: além das policies, retiramos os privilégios.
do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke insert, update, delete, truncate on public.%I from anon', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Storage: dois buckets públicos para leitura, escrita só de admins.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', true, 8388608,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']),
  ('documents', 'documents', true, 20971520,
    array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "admins upload files" on storage.objects for insert to authenticated
  with check (bucket_id in ('media', 'documents') and public.is_admin());
create policy "admins update files" on storage.objects for update to authenticated
  using (bucket_id in ('media', 'documents') and public.is_admin())
  with check (bucket_id in ('media', 'documents') and public.is_admin());
create policy "admins delete files" on storage.objects for delete to authenticated
  using (bucket_id in ('media', 'documents') and public.is_admin());
create policy "admins list files" on storage.objects for select to authenticated
  using (bucket_id in ('media', 'documents') and public.is_admin());

-- ---------------------------------------------------------------------
-- Realtime: placar, súmula, sorteio e chaveamento ao vivo.
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.matches, public.match_events, public.registrations, public.teams;
  end if;
end;
$$;

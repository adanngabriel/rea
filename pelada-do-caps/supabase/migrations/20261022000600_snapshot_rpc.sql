-- =====================================================================
-- Desempenho: o servidor do site e o banco ficam em regiões diferentes,
-- então cada ida ao banco custa caro. Estas funções devolvem, numa única
-- chamada, tudo o que antes exigia várias consultas em sequência.
-- Rodam com as permissões de quem chama (security invoker): o RLS vale.
-- =====================================================================

-- Retrato completo de uma edição (atual ou pelo endereço).
create or replace function public.edition_snapshot(p_slug text default null)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with ed as (
    select e.* from public.editions e
    where (p_slug is null and e.is_current) or e.slug = p_slug
    order by e.is_current desc
    limit 1
  ),
  m as (select x.* from public.matches x join ed on x.edition_id = ed.id),
  r as (select x.* from public.registrations x join ed on x.edition_id = ed.id)
  select case when not exists (select 1 from ed) then null else jsonb_build_object(
    'edition', (select to_jsonb(ed) from ed),
    'rounds', coalesce((select jsonb_agg(to_jsonb(x) order by x.sort_order) from public.rounds x join ed on x.edition_id = ed.id), '[]'),
    'teams', coalesce((select jsonb_agg(to_jsonb(x) order by x.sort_order, x.name) from public.teams x join ed on x.edition_id = ed.id), '[]'),
    'registrations', coalesce((select jsonb_agg(to_jsonb(r)) from r), '[]'),
    'players', coalesce((select jsonb_agg(to_jsonb(p)) from public.players p where p.id in (select player_id from r)), '[]'),
    'matches', coalesce((select jsonb_agg(to_jsonb(m)) from m), '[]'),
    'events', coalesce((select jsonb_agg(to_jsonb(x) order by x.minute nulls last, x.created_at) from public.match_events x where x.match_id in (select id from m)), '[]'),
    'lineups', coalesce((select jsonb_agg(to_jsonb(x)) from public.match_lineups x where x.match_id in (select id from m)), '[]'),
    'suspensions', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.suspensions x join ed on x.edition_id = ed.id), '[]'),
    'awards', coalesce((select jsonb_agg(to_jsonb(x) order by x.sort_order) from public.awards x join ed on x.edition_id = ed.id), '[]')
  ) end;
$$;
grant execute on function public.edition_snapshot(text) to anon, authenticated;

-- Contexto do painel: confirma o administrador e já traz a edição atual.
create or replace function public.admin_context()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'is_admin', public.is_admin(),
    'edition', (select to_jsonb(e) from public.editions e where e.is_current limit 1)
  );
$$;
revoke all on function public.admin_context() from public, anon;
grant execute on function public.admin_context() to authenticated;

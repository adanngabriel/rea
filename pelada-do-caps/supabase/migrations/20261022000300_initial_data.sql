-- =====================================================================
-- Estrutura inicial do 1º Torneio da Pelada do Caps.
-- Idempotente: pode ser executada novamente sem duplicar dados.
-- Horários, regras disciplinares e formato do mata-mata NÃO são
-- inventados aqui: ficam "a definir" e são configurados no painel.
-- =====================================================================

insert into public.site_settings (id, site_name, tagline)
values (1, 'Torneio da Pelada do Caps', 'Inter Academy • 2026')
on conflict (id) do nothing;

insert into public.tournaments (name, slug)
values ('Torneio da Pelada do Caps', 'pelada-do-caps')
on conflict (slug) do nothing;

insert into public.editions (
  tournament_id, name, slug, edition_number, season, venue,
  starts_on, ends_on, status, is_current, rules
)
select t.id, '1º Torneio da Pelada do Caps', '2026', 1, '2026', 'Inter Academy',
  date '2026-11-02', date '2026-11-19', 'upcoming',
  not exists (select 1 from public.editions where is_current),
  jsonb_build_object(
    'points', jsonb_build_object('win', 3, 'draw', 1, 'loss', 0),
    'tiebreakers', jsonb_build_array('points', 'wins', 'goal_difference', 'goals_for', 'head_to_head'),
    'manualOrder', jsonb_build_array(),
    'discipline', jsonb_build_object(
      'yellowsForSuspension', null,
      'yellowSuspensionMatches', 1,
      'redSuspensionMatches', null,
      'redCancelsSameMatchYellows', true
    ),
    'knockout', jsonb_build_object('preset', 'none', 'slots', jsonb_build_array()),
    'matchDurationMinutes', null,
    'maxPlayersPerTeam', null
  )
from public.tournaments t
where t.slug = 'pelada-do-caps'
on conflict (slug) do nothing;

insert into public.rounds (edition_id, name, phase, sort_order, scheduled_on)
select e.id, r.name, r.phase::public.match_phase, r.sort_order, r.scheduled_on
from public.editions e
cross join (values
  ('1ª Rodada', 'group', 1, date '2026-11-02'),
  ('2ª Rodada', 'group', 2, date '2026-11-09'),
  ('3ª Rodada', 'group', 3, date '2026-11-16'),
  ('Final', 'knockout', 4, date '2026-11-19')
) as r (name, phase, sort_order, scheduled_on)
where e.slug = '2026'
  and not exists (select 1 from public.rounds x where x.edition_id = e.id);

insert into public.teams (edition_id, name, short_name, slug, primary_color, secondary_color, sort_order)
select e.id, t.name, t.short_name, t.slug, t.primary_color, t.secondary_color, t.sort_order
from public.editions e
cross join (values
  ('Time 1', 'T1', 'time-1', '#2563eb', '#ffffff', 1),
  ('Time 2', 'T2', 'time-2', '#dc2626', '#ffffff', 2),
  ('Time 3', 'T3', 'time-3', '#16a34a', '#ffffff', 3),
  ('Time 4', 'T4', 'time-4', '#f59e0b', '#111827', 4)
) as t (name, short_name, slug, primary_color, secondary_color, sort_order)
where e.slug = '2026'
  and not exists (select 1 from public.teams x where x.edition_id = e.id);

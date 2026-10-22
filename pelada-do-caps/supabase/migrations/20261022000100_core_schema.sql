-- =====================================================================
-- Torneio da Pelada do Caps — esquema principal
--
-- Fonte da verdade:
--   * partidas (matches) + eventos da súmula (match_events) + escalações
--     (match_lineups) são os únicos dados esportivos digitados.
--   * placar, classificação, artilharia, assistências, cartões,
--     suspensões automáticas e chaveamento são DERIVADOS desses dados
--     pela camada de domínio (src/domain) e nunca armazenados.
-- =====================================================================

create type public.match_status as enum (
  'scheduled', 'live', 'halftime', 'finished', 'postponed', 'cancelled'
);
create type public.match_phase as enum ('group', 'knockout');
create type public.match_event_type as enum ('goal', 'own_goal', 'yellow', 'red', 'mvp');

-- ---------------------------------------------------------------------
-- Administradores (ligados ao Supabase Auth)
-- ---------------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Identidade do site (linha única)
-- ---------------------------------------------------------------------
create table public.site_settings (
  id smallint primary key default 1 check (id = 1),
  site_name text not null,
  tagline text,
  site_url text,
  instagram_url text,
  whatsapp_url text,
  contact_email text,
  og_image_url text,
  updated_at timestamptz not null default now()
);
create trigger site_settings_touch before update on public.site_settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Torneio e edições (permite várias edições no futuro)
-- ---------------------------------------------------------------------
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.editions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete restrict,
  name text not null,
  slug text not null unique,
  edition_number integer check (edition_number > 0),
  season text,
  venue text,
  venue_address text,
  starts_on date,
  ends_on date,
  status text not null default 'upcoming' check (status in ('upcoming', 'ongoing', 'finished')),
  is_current boolean not null default false,
  description text,
  about text,
  logo_url text,
  hero_image_url text,
  rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create unique index editions_single_current on public.editions (is_current) where is_current;
create trigger editions_touch before update on public.editions
  for each row execute function public.touch_updated_at();

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions (id) on delete cascade,
  name text not null,
  phase public.match_phase not null default 'group',
  sort_order integer not null default 0,
  scheduled_on date,
  notes text,
  created_at timestamptz not null default now(),
  unique (id, edition_id)
);
create index rounds_edition on public.rounds (edition_id, sort_order);

-- ---------------------------------------------------------------------
-- Times
-- ---------------------------------------------------------------------
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions (id) on delete cascade,
  name text not null,
  short_name text,
  slug text not null,
  crest_url text,
  photo_url text,
  primary_color text not null default '#22c55e' check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  secondary_color text not null default '#ffffff' check (secondary_color ~ '^#[0-9a-fA-F]{6}$'),
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (edition_id, slug),
  unique (id, edition_id)
);
create trigger teams_touch before update on public.teams
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Jogadores (pessoa) e inscrições por edição
-- ---------------------------------------------------------------------
create table public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nickname text,
  slug text not null unique,
  photo_url text,
  position text check (position in ('GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA')),
  is_goalkeeper boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger players_touch before update on public.players
  for each row execute function public.touch_updated_at();

-- Observações internas ficam fora da tabela pública.
create table public.player_admin_notes (
  player_id uuid primary key references public.players (id) on delete cascade,
  notes text not null,
  updated_at timestamptz not null default now()
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  team_id uuid,
  shirt_number smallint check (shirt_number between 0 and 999),
  pot text,
  is_captain boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (edition_id, player_id),
  foreign key (team_id, edition_id) references public.teams (id, edition_id) on delete set null (team_id),
  check (team_id is not null or not is_captain)
);
create unique index registrations_one_captain on public.registrations (team_id) where is_captain;
create unique index registrations_unique_shirt on public.registrations (team_id, shirt_number)
  where team_id is not null and shirt_number is not null;
create index registrations_team on public.registrations (team_id);
create trigger registrations_touch before update on public.registrations
  for each row execute function public.touch_updated_at();

-- Trocar o jogador de time remove a braçadeira, salvo se a mesma
-- alteração definir explicitamente o capitão.
create or replace function public.registrations_clear_captain()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.team_id is distinct from old.team_id and new.is_captain = old.is_captain then
    new.is_captain := false;
  end if;
  return new;
end;
$$;
create trigger registrations_clear_captain before update of team_id on public.registrations
  for each row execute function public.registrations_clear_captain();

-- ---------------------------------------------------------------------
-- Partidas
-- ---------------------------------------------------------------------
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions (id) on delete cascade,
  round_id uuid,
  phase public.match_phase not null default 'group',
  bracket_slot text,
  label text,
  home_team_id uuid,
  away_team_id uuid,
  teams_locked boolean not null default false,
  scheduled_at timestamptz,
  venue text,
  status public.match_status not null default 'scheduled',
  home_penalties smallint check (home_penalties >= 0),
  away_penalties smallint check (away_penalties >= 0),
  notes text,
  attendance integer check (attendance >= 0),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, edition_id),
  unique (edition_id, bracket_slot),
  foreign key (round_id, edition_id) references public.rounds (id, edition_id) on delete set null (round_id),
  foreign key (home_team_id, edition_id) references public.teams (id, edition_id) on delete set null (home_team_id),
  foreign key (away_team_id, edition_id) references public.teams (id, edition_id) on delete set null (away_team_id),
  check (home_team_id is null or away_team_id is null or home_team_id <> away_team_id),
  check ((home_penalties is null) = (away_penalties is null)),
  check (bracket_slot is null or phase = 'knockout')
);
create index matches_edition on public.matches (edition_id, scheduled_at);
create trigger matches_touch before update on public.matches
  for each row execute function public.touch_updated_at();

create or replace function public.matches_track_finish()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'finished' and (tg_op = 'INSERT' or old.status is distinct from 'finished') then
    new.finished_at := coalesce(new.finished_at, now());
  elsif new.status <> 'finished' then
    new.finished_at := null;
  end if;
  return new;
end;
$$;
create trigger matches_track_finish before insert or update of status on public.matches
  for each row execute function public.matches_track_finish();

-- Eventos da súmula. team_id é sempre o time CREDITADO:
--   goal/own_goal: time que recebe o gol no placar
--   yellow/red/mvp: time do jogador
create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  type public.match_event_type not null,
  team_id uuid not null references public.teams (id) on delete cascade,
  player_id uuid references public.players (id) on delete set null,
  assist_player_id uuid references public.players (id) on delete set null,
  minute smallint check (minute between 0 and 200),
  notes text,
  created_at timestamptz not null default now(),
  check (assist_player_id is null or type = 'goal'),
  check (assist_player_id is null or assist_player_id <> player_id),
  check (player_id is not null or type in ('goal', 'own_goal'))
);
create index match_events_match on public.match_events (match_id);
create index match_events_player on public.match_events (player_id);
create unique index match_events_single_mvp on public.match_events (match_id) where type = 'mvp';

create or replace function public.match_events_check_team()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  m public.matches;
begin
  select * into m from public.matches where id = new.match_id;
  if new.team_id is distinct from m.home_team_id and new.team_id is distinct from m.away_team_id then
    raise exception 'O time do evento precisa ser um dos times da partida'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger match_events_check_team before insert or update on public.match_events
  for each row execute function public.match_events_check_team();

-- Escalação opcional. Sem escalação, considera-se o elenco do time.
create table public.match_lineups (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  primary key (match_id, player_id)
);

-- ---------------------------------------------------------------------
-- Disciplina: suspensões automáticas são derivadas das regras; esta
-- tabela guarda apenas decisões manuais (punições extras e anulações).
-- ---------------------------------------------------------------------
create table public.suspensions (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  kind text not null check (kind in ('manual', 'void_auto')),
  matches smallint check (matches > 0),
  from_match_id uuid references public.matches (id) on delete set null,
  auto_key text,
  reason text not null check (length(trim(reason)) > 0),
  created_at timestamptz not null default now(),
  check ((kind = 'manual' and matches is not null) or (kind = 'void_auto' and auto_key is not null))
);
create index suspensions_edition on public.suspensions (edition_id);

-- ---------------------------------------------------------------------
-- Premiações (campeão, vice, artilheiro, craque, destaques da rodada...)
-- ---------------------------------------------------------------------
create table public.awards (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions (id) on delete cascade,
  category text not null check (category in (
    'champion', 'runner_up', 'third_place', 'top_scorer', 'best_player',
    'best_goalkeeper', 'round_highlight', 'other'
  )),
  title text not null,
  round_id uuid references public.rounds (id) on delete cascade,
  team_id uuid references public.teams (id) on delete set null,
  player_id uuid references public.players (id) on delete set null,
  description text,
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index awards_edition on public.awards (edition_id);

-- ---------------------------------------------------------------------
-- Conteúdo
-- ---------------------------------------------------------------------
create table public.news (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid references public.editions (id) on delete set null,
  slug text not null unique,
  title text not null,
  subtitle text,
  cover_url text,
  body text not null default '',
  category text not null default 'noticia'
    check (category in ('noticia', 'comunicado', 'organizacao', 'resultado', 'sorteio')),
  author text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz not null default now(),
  external_url text,
  cta_label text,
  cta_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index news_published on public.news (status, published_at desc);
create trigger news_touch before update on public.news
  for each row execute function public.touch_updated_at();

create table public.press_links (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid references public.editions (id) on delete set null,
  title text not null,
  outlet text,
  image_url text,
  summary text,
  url text not null,
  published_on date,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid references public.editions (id) on delete set null,
  title text not null,
  description text,
  category text not null default 'regulamento'
    check (category in ('regulamento', 'edital', 'comunicado', 'tabela', 'sumula', 'disciplinar', 'outro')),
  file_url text,
  external_url text,
  published_on date not null default current_date,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  check (file_url is not null or external_url is not null)
);

create table public.gallery_albums (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid references public.editions (id) on delete set null,
  title text not null,
  description text,
  category text not null default 'outro'
    check (category in ('sorteio', 'rodada-1', 'rodada-2', 'rodada-3', 'final', 'premiacao', 'bastidores', 'outro')),
  cover_url text,
  event_date date,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.gallery_albums (id) on delete cascade,
  kind text not null default 'photo' check (kind in ('photo', 'video')),
  url text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index gallery_items_album on public.gallery_items (album_id, sort_order);

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  website_url text,
  tier text not null default 'apoio' check (tier in ('master', 'patrocinio', 'apoio')),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Auditoria
-- ---------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  edition_id uuid references public.editions (id) on delete set null,
  actor_id uuid,
  actor_email text,
  action text not null,
  entity text not null,
  entity_id text,
  summary text not null,
  before jsonb,
  after jsonb,
  undone_at timestamptz,
  created_at timestamptz not null default now()
);
create index audit_logs_recent on public.audit_logs (created_at desc);
create index audit_logs_action on public.audit_logs (edition_id, action, created_at desc);

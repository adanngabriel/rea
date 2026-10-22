// Linhas do banco usadas pela camada de domínio. Espelham as migrations em
// supabase/migrations; dados derivados (placar, classificação, estatísticas)
// nunca aparecem aqui.

export type MatchStatus = "scheduled" | "live" | "halftime" | "finished" | "postponed" | "cancelled";
export type MatchPhase = "group" | "knockout";
export type MatchEventType = "goal" | "own_goal" | "yellow" | "red" | "mvp";
export type PlayerPosition = "GOL" | "ZAG" | "LAT" | "VOL" | "MEI" | "ATA";

export interface Edition {
  id: string;
  tournament_id: string;
  name: string;
  slug: string;
  edition_number: number | null;
  season: string | null;
  venue: string | null;
  venue_address: string | null;
  starts_on: string | null;
  ends_on: string | null;
  status: "upcoming" | "ongoing" | "finished";
  is_current: boolean;
  description: string | null;
  about: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  rules: unknown;
}

export interface Round {
  id: string;
  edition_id: string;
  name: string;
  phase: MatchPhase;
  sort_order: number;
  scheduled_on: string | null;
  notes: string | null;
}

export interface Team {
  id: string;
  edition_id: string;
  name: string;
  short_name: string | null;
  slug: string;
  crest_url: string | null;
  photo_url: string | null;
  primary_color: string;
  secondary_color: string;
  description: string | null;
  sort_order: number;
}

export interface Player {
  id: string;
  name: string;
  nickname: string | null;
  slug: string;
  photo_url: string | null;
  position: PlayerPosition | null;
  is_goalkeeper: boolean;
  active: boolean;
}

export interface Registration {
  id: string;
  edition_id: string;
  player_id: string;
  team_id: string | null;
  shirt_number: number | null;
  pot: string | null;
  is_captain: boolean;
  updated_at: string;
}

export interface Match {
  id: string;
  edition_id: string;
  round_id: string | null;
  phase: MatchPhase;
  bracket_slot: string | null;
  label: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  teams_locked: boolean;
  scheduled_at: string | null;
  venue: string | null;
  status: MatchStatus;
  home_penalties: number | null;
  away_penalties: number | null;
  notes: string | null;
  attendance: number | null;
  finished_at: string | null;
  created_at: string;
}

export interface MatchEvent {
  id: string;
  match_id: string;
  type: MatchEventType;
  team_id: string;
  player_id: string | null;
  assist_player_id: string | null;
  minute: number | null;
  notes: string | null;
  created_at: string;
}

export interface MatchLineup {
  match_id: string;
  player_id: string;
  team_id: string;
}

export interface Suspension {
  id: string;
  edition_id: string;
  player_id: string;
  kind: "manual" | "void_auto";
  matches: number | null;
  from_match_id: string | null;
  auto_key: string | null;
  reason: string;
  created_at: string;
}

export type AwardCategory =
  | "champion"
  | "runner_up"
  | "third_place"
  | "top_scorer"
  | "best_player"
  | "best_goalkeeper"
  | "round_highlight"
  | "other";

export interface Award {
  id: string;
  edition_id: string;
  category: AwardCategory;
  title: string;
  round_id: string | null;
  team_id: string | null;
  player_id: string | null;
  description: string | null;
  image_url: string | null;
  sort_order: number;
}

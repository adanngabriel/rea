import type { z } from "zod";
import { rulesSchema } from "./rules";
import type { Snapshot } from "./snapshot";
import type { Match, MatchEvent, MatchEventType, Player, Registration, Team } from "./types";

let seq = 0;
const id = (prefix: string) => `${prefix}-${++seq}`;

export function team(name: string, sort_order = 0): Team {
  return {
    id: `team-${name}`,
    edition_id: "ed",
    name,
    short_name: null,
    slug: name.toLowerCase(),
    crest_url: null,
    photo_url: null,
    primary_color: "#000000",
    secondary_color: "#ffffff",
    description: null,
    sort_order,
  };
}

export function player(name: string): Player {
  return {
    id: `player-${name}`,
    name,
    nickname: null,
    slug: name.toLowerCase(),
    photo_url: null,
    position: null,
    is_goalkeeper: false,
    active: true,
  };
}

export function registration(p: Player, t: Team | null): Registration {
  return {
    id: id("reg"),
    edition_id: "ed",
    player_id: p.id,
    team_id: t?.id ?? null,
    shirt_number: null,
    pot: null,
    is_captain: false,
    updated_at: "2026-10-30T00:00:00.000Z",
  };
}

export function match(home: Team | null, away: Team | null, day: number, extra: Partial<Match> = {}): Match {
  return {
    id: id("match"),
    edition_id: "ed",
    round_id: null,
    phase: "group",
    bracket_slot: null,
    label: null,
    home_team_id: home?.id ?? null,
    away_team_id: away?.id ?? null,
    teams_locked: false,
    scheduled_at: `2026-11-${String(day).padStart(2, "0")}T22:00:00.000Z`,
    venue: null,
    status: "finished",
    home_penalties: null,
    away_penalties: null,
    notes: null,
    attendance: null,
    finished_at: `2026-11-${String(day).padStart(2, "0")}T23:30:00.000Z`,
    created_at: "2026-10-01T00:00:00.000Z",
    ...extra,
  };
}

export function event(m: Match, type: MatchEventType, t: Team, p: Player | null, assist?: Player): MatchEvent {
  return {
    id: id("ev"),
    match_id: m.id,
    type,
    team_id: t.id,
    player_id: p?.id ?? null,
    assist_player_id: assist?.id ?? null,
    minute: null,
    notes: null,
    created_at: "2026-11-01T00:00:00.000Z",
  };
}

/** Gols de um placar sem autor identificado. */
export function goals(m: Match, t: Team, n: number): MatchEvent[] {
  return Array.from({ length: n }, () => event(m, "goal", t, null));
}

export function snapshot(partial: Omit<Partial<Snapshot>, "rules"> & { rules?: z.input<typeof rulesSchema> }): Snapshot {
  return {
    edition: {
      id: "ed",
      tournament_id: "t",
      name: "1º Torneio da Pelada do Caps",
      slug: "2026",
      edition_number: 1,
      season: "2026",
      venue: "Inter Academy",
      venue_address: null,
      starts_on: "2026-11-02",
      ends_on: "2026-11-19",
      status: "upcoming",
      is_current: true,
      description: null,
      about: null,
      logo_url: null,
      hero_image_url: null,
      rules: {},
    },
    rounds: [],
    teams: [],
    players: [],
    registrations: [],
    matches: [],
    events: [],
    lineups: [],
    suspensions: [],
    awards: [],
    rulesIssues: [],
    ...partial,
    rules: rulesSchema.parse(partial.rules ?? {}),
  };
}

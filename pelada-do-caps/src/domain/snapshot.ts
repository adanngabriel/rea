import type { Rules } from "./rules";
import type {
  Award,
  Edition,
  Match,
  MatchEvent,
  MatchLineup,
  Player,
  Registration,
  Round,
  Suspension,
  Team,
} from "./types";

/** Todos os dados esportivos de uma edição. Um torneio amador cabe com folga
 * em memória, então cada página deriva o que precisa do mesmo retrato —
 * assim placar, tabela e estatísticas nunca divergem entre si. */
export interface Snapshot {
  edition: Edition;
  rules: Rules;
  rulesIssues: string[];
  rounds: Round[];
  teams: Team[];
  players: Player[];
  registrations: Registration[];
  matches: Match[];
  events: MatchEvent[];
  lineups: MatchLineup[];
  suspensions: Suspension[];
  awards: Award[];
}

export interface RosterEntry {
  player: Player;
  registration: Registration;
  team: Team | null;
}

export function rosterEntries(s: Pick<Snapshot, "players" | "registrations" | "teams">): RosterEntry[] {
  const players = new Map(s.players.map((p) => [p.id, p]));
  const teams = new Map(s.teams.map((t) => [t.id, t]));
  const out: RosterEntry[] = [];
  for (const registration of s.registrations) {
    const player = players.get(registration.player_id);
    if (!player) continue;
    out.push({ player, registration, team: registration.team_id ? (teams.get(registration.team_id) ?? null) : null });
  }
  return out.sort((a, b) => displayName(a.player).localeCompare(displayName(b.player), "pt-BR"));
}

export function displayName(p: Pick<Player, "name" | "nickname">): string {
  return p.nickname?.trim() || p.name;
}

export function teamRoster(entries: readonly RosterEntry[], teamId: string): RosterEntry[] {
  const order: Record<string, number> = { GOL: 0, ZAG: 1, LAT: 2, VOL: 3, MEI: 4, ATA: 5 };
  return entries
    .filter((e) => e.registration.team_id === teamId)
    .sort(
      (a, b) =>
        Number(b.registration.is_captain) - Number(a.registration.is_captain) ||
        (order[a.player.position ?? ""] ?? 9) - (order[b.player.position ?? ""] ?? 9) ||
        (a.registration.shirt_number ?? 999) - (b.registration.shirt_number ?? 999) ||
        displayName(a.player).localeCompare(displayName(b.player), "pt-BR"),
    );
}

/** Ordem cronológica das partidas: data marcada, depois rodada, depois cadastro. */
export function sortMatches(matches: readonly Match[], rounds: readonly Round[]): Match[] {
  const roundOrder = new Map(rounds.map((r) => [r.id, r.sort_order]));
  return [...matches].sort((a, b) => {
    const ta = a.scheduled_at ? Date.parse(a.scheduled_at) : Infinity;
    const tb = b.scheduled_at ? Date.parse(b.scheduled_at) : Infinity;
    if (ta !== tb) return ta - tb;
    const ra = a.round_id ? (roundOrder.get(a.round_id) ?? 0) : Infinity;
    const rb = b.round_id ? (roundOrder.get(b.round_id) ?? 0) : Infinity;
    if (ra !== rb) return ra - rb;
    return Date.parse(a.created_at) - Date.parse(b.created_at);
  });
}

export function byId<T extends { id: string }>(rows: readonly T[]): Map<string, T> {
  return new Map(rows.map((r) => [r.id, r]));
}

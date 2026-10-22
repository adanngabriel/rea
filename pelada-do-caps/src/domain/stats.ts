import { isFinished } from "./score";
import { rosterEntries, type RosterEntry, type Snapshot } from "./snapshot";

export interface PlayerStats {
  games: number;
  goals: number;
  assists: number;
  ownGoals: number;
  yellow: number;
  red: number;
  mvp: number;
}

const zero = (): PlayerStats => ({ games: 0, goals: 0, assists: 0, ownGoals: 0, yellow: 0, red: 0, mvp: 0 });

/** Estatísticas individuais derivadas da súmula de todas as fases.
 * Jogos disputados: escalação registrada da partida; sem escalação, o
 * elenco atual do time; e sempre quem tiver algum evento na partida. */
export function computePlayerStats(s: Snapshot): Map<string, PlayerStats> {
  const stats = new Map<string, PlayerStats>();
  const get = (id: string) => {
    let v = stats.get(id);
    if (!v) stats.set(id, (v = zero()));
    return v;
  };
  for (const r of s.registrations) get(r.player_id);

  const finished = new Map(s.matches.filter(isFinished).map((m) => [m.id, m]));
  const lineupsByMatchTeam = new Map<string, string[]>();
  for (const l of s.lineups) {
    const key = `${l.match_id}:${l.team_id}`;
    lineupsByMatchTeam.set(key, [...(lineupsByMatchTeam.get(key) ?? []), l.player_id]);
  }
  const rosterByTeam = new Map<string, string[]>();
  for (const r of s.registrations) {
    if (r.team_id) rosterByTeam.set(r.team_id, [...(rosterByTeam.get(r.team_id) ?? []), r.player_id]);
  }
  const eventPlayersByMatch = new Map<string, Set<string>>();
  for (const e of s.events) {
    for (const id of [e.player_id, e.assist_player_id]) {
      if (!id) continue;
      if (!eventPlayersByMatch.has(e.match_id)) eventPlayersByMatch.set(e.match_id, new Set());
      eventPlayersByMatch.get(e.match_id)!.add(id);
    }
  }
  for (const m of finished.values()) {
    const played = new Set<string>(eventPlayersByMatch.get(m.id));
    for (const teamId of [m.home_team_id, m.away_team_id]) {
      if (!teamId) continue;
      const ids = lineupsByMatchTeam.get(`${m.id}:${teamId}`) ?? rosterByTeam.get(teamId) ?? [];
      for (const id of ids) played.add(id);
    }
    for (const id of played) get(id).games++;
  }

  // Eventos de partidas em andamento também contam (artilharia ao vivo);
  // partidas canceladas, adiadas ou agendadas não.
  const counting = new Set(
    s.matches.filter((m) => m.status === "finished" || m.status === "live" || m.status === "halftime").map((m) => m.id),
  );
  for (const e of s.events) {
    if (!counting.has(e.match_id)) continue;
    if (e.type === "goal" && e.player_id) get(e.player_id).goals++;
    if (e.type === "own_goal" && e.player_id) get(e.player_id).ownGoals++;
    if (e.type === "goal" && e.assist_player_id) get(e.assist_player_id).assists++;
    if (e.type === "yellow" && e.player_id) get(e.player_id).yellow++;
    if (e.type === "red" && e.player_id) get(e.player_id).red++;
    if (e.type === "mvp" && e.player_id) get(e.player_id).mvp++;
  }
  return stats;
}

export type LeaderboardKey = "goals" | "assists" | "mvp" | "yellow" | "red";

export interface LeaderboardRow {
  rank: number;
  entry: RosterEntry;
  value: number;
  stats: PlayerStats;
}

/** Ranking com empates dividindo a mesma posição (1º, 1º, 3º...). */
export function leaderboard(s: Snapshot, key: LeaderboardKey, stats = computePlayerStats(s)): LeaderboardRow[] {
  const rows = rosterEntries(s)
    .map((entry) => ({ entry, stats: stats.get(entry.player.id) ?? zero() }))
    .map((r) => ({ ...r, value: r.stats[key] }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value || a.stats.games - b.stats.games);
  let rank = 0;
  return rows.map((r, i) => {
    if (i === 0 || rows[i - 1].value !== r.value) rank = i + 1;
    return { rank, ...r };
  });
}

export interface TeamTotals {
  goalsFor: number;
  goalsAgainst: number;
  yellow: number;
  red: number;
  played: number;
}

/** Totais do time somando todas as fases (a classificação usa só a fase
 * classificatória). */
export function teamTotals(s: Snapshot, teamId: string): TeamTotals {
  const counting = new Set(
    s.matches
      .filter((m) => m.status === "finished" && (m.home_team_id === teamId || m.away_team_id === teamId))
      .map((m) => m.id),
  );
  const t: TeamTotals = { goalsFor: 0, goalsAgainst: 0, yellow: 0, red: 0, played: counting.size };
  for (const e of s.events) {
    if (!counting.has(e.match_id)) continue;
    const mine = e.team_id === teamId;
    if (e.type === "goal" || e.type === "own_goal") {
      if (mine) t.goalsFor++;
      else t.goalsAgainst++;
    }
    if (mine && e.type === "yellow") t.yellow++;
    if (mine && e.type === "red") t.red++;
  }
  return t;
}

export function totalGoals(s: Snapshot): number {
  const counting = new Set(
    s.matches.filter((m) => m.status === "finished" || m.status === "live" || m.status === "halftime").map((m) => m.id),
  );
  return s.events.filter((e) => counting.has(e.match_id) && (e.type === "goal" || e.type === "own_goal")).length;
}

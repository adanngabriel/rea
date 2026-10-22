import type { Rules, Tiebreaker } from "./rules";
import { scoreOf } from "./score";
import type { Match, MatchEvent, Team } from "./types";

export type FormResult = "V" | "E" | "D";

export interface StandingRow {
  team: Team;
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  yellow: number;
  red: number;
  /** Últimos resultados, do mais antigo ao mais recente. */
  form: FormResult[];
  /** Empate que os critérios configurados não conseguiram desfazer. */
  unresolvedTie: boolean;
}

interface Totals extends Omit<StandingRow, "position" | "unresolvedTie"> {}

/** Partidas que entram na classificação: fase classificatória encerrada. */
export function standingsMatches(matches: readonly Match[]): Match[] {
  return matches.filter(
    (m) => m.phase === "group" && m.status === "finished" && m.home_team_id && m.away_team_id,
  );
}

export function isGroupStageComplete(matches: readonly Match[]): boolean {
  const group = matches.filter((m) => m.phase === "group");
  return group.length > 0 && group.every((m) => m.status === "finished" || m.status === "cancelled");
}

function emptyTotals(team: Team): Totals {
  return {
    team,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    yellow: 0,
    red: 0,
    form: [],
  };
}

function matchTime(m: Match): number {
  return Date.parse(m.scheduled_at ?? m.finished_at ?? m.created_at);
}

function tally(teams: readonly Team[], matches: readonly Match[], events: readonly MatchEvent[], rules: Rules) {
  const totals = new Map(teams.map((t) => [t.id, emptyTotals(t)]));
  const ordered = [...matches].sort((a, b) => matchTime(a) - matchTime(b));
  for (const m of ordered) {
    const home = totals.get(m.home_team_id!);
    const away = totals.get(m.away_team_id!);
    if (!home || !away) continue;
    const s = scoreOf(m, events);
    home.played++;
    away.played++;
    home.goalsFor += s.home;
    home.goalsAgainst += s.away;
    away.goalsFor += s.away;
    away.goalsAgainst += s.home;
    if (s.home === s.away) {
      home.draws++;
      away.draws++;
      home.points += rules.points.draw;
      away.points += rules.points.draw;
      home.form.push("E");
      away.form.push("E");
    } else {
      const [w, l] = s.home > s.away ? [home, away] : [away, home];
      w.wins++;
      l.losses++;
      w.points += rules.points.win;
      l.points += rules.points.loss;
      w.form.push("V");
      l.form.push("D");
    }
  }
  const matchIds = new Set(matches.map((m) => m.id));
  for (const e of events) {
    if (!matchIds.has(e.match_id)) continue;
    const t = totals.get(e.team_id);
    if (!t) continue;
    if (e.type === "yellow") t.yellow++;
    if (e.type === "red") t.red++;
  }
  for (const t of totals.values()) t.goalDifference = t.goalsFor - t.goalsAgainst;
  return totals;
}

/** Valor de ordenação de um critério para um grupo empatado (maior = melhor). */
function criterionKeys(
  criterion: Tiebreaker,
  group: Totals[],
  matches: readonly Match[],
  events: readonly MatchEvent[],
  rules: Rules,
): Map<string, number[]> {
  const keys = new Map<string, number[]>();
  switch (criterion) {
    case "points":
      for (const t of group) keys.set(t.team.id, [t.points]);
      break;
    case "wins":
      for (const t of group) keys.set(t.team.id, [t.wins]);
      break;
    case "goal_difference":
      for (const t of group) keys.set(t.team.id, [t.goalDifference]);
      break;
    case "goals_for":
      for (const t of group) keys.set(t.team.id, [t.goalsFor]);
      break;
    case "fewer_goals_against":
      for (const t of group) keys.set(t.team.id, [-t.goalsAgainst]);
      break;
    case "fair_play":
      for (const t of group) keys.set(t.team.id, [-(t.red * 3 + t.yellow)]);
      break;
    case "manual_order":
      for (const t of group) {
        const index = rules.manualOrder.indexOf(t.team.id);
        keys.set(t.team.id, [index === -1 ? -Infinity : -index]);
      }
      break;
    case "head_to_head": {
      // Mini-tabela apenas com os jogos entre os times empatados.
      const ids = new Set(group.map((t) => t.team.id));
      const direct = matches.filter((m) => ids.has(m.home_team_id!) && ids.has(m.away_team_id!));
      const mini = tally(
        group.map((t) => t.team),
        direct,
        events,
        rules,
      );
      for (const t of group) {
        const r = mini.get(t.team.id)!;
        keys.set(t.team.id, [r.points, r.goalDifference, r.goalsFor]);
      }
      break;
    }
  }
  return keys;
}

function compareKeys(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (b[i] ?? 0) - (a[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Ordena aplicando os critérios em sequência. Cada critério só separa
 * times que continuam empatados em todos os critérios anteriores. */
function rank(
  group: Totals[],
  criteria: readonly Tiebreaker[],
  matches: readonly Match[],
  events: readonly MatchEvent[],
  rules: Rules,
): { totals: Totals; unresolved: boolean }[] {
  if (group.length <= 1) return group.map((totals) => ({ totals, unresolved: false }));
  if (criteria.length === 0) {
    const fallback = [...group].sort(
      (a, b) => a.team.sort_order - b.team.sort_order || a.team.name.localeCompare(b.team.name, "pt-BR"),
    );
    return fallback.map((totals) => ({ totals, unresolved: true }));
  }
  const [criterion, ...rest] = criteria;
  const keys = criterionKeys(criterion, group, matches, events, rules);
  const sorted = [...group].sort((a, b) => compareKeys(keys.get(a.team.id)!, keys.get(b.team.id)!));
  const out: { totals: Totals; unresolved: boolean }[] = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i + 1;
    while (j < sorted.length && compareKeys(keys.get(sorted[i].team.id)!, keys.get(sorted[j].team.id)!) === 0) j++;
    out.push(...rank(sorted.slice(i, j), rest, matches, events, rules));
    i = j;
  }
  return out;
}

export function computeStandings(
  teams: readonly Team[],
  allMatches: readonly Match[],
  events: readonly MatchEvent[],
  rules: Rules,
): StandingRow[] {
  const matches = standingsMatches(allMatches);
  const totals = tally(teams, matches, events, rules);
  const ranked = rank([...totals.values()], rules.tiebreakers, matches, events, rules);
  const anyPlayed = ranked.some((r) => r.totals.played > 0);
  return ranked.map(({ totals: t, unresolved }, index) => ({
    ...t,
    form: t.form.slice(-5),
    position: index + 1,
    // Antes do primeiro jogo, todos estão naturalmente empatados.
    unresolvedTie: anyPlayed && unresolved,
  }));
}

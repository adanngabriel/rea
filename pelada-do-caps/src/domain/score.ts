import type { Match, MatchEvent } from "./types";

export interface Score {
  home: number;
  away: number;
}

/** Placar derivado dos gols da súmula — a única fonte do placar. */
export function scoreOf(match: Match, events: readonly MatchEvent[]): Score {
  let home = 0;
  let away = 0;
  for (const e of events) {
    if (e.match_id !== match.id || (e.type !== "goal" && e.type !== "own_goal")) continue;
    if (e.team_id === match.home_team_id) home++;
    else if (e.team_id === match.away_team_id) away++;
  }
  return { home, away };
}

export const isLive = (m: Pick<Match, "status">) => m.status === "live" || m.status === "halftime";
export const isFinished = (m: Pick<Match, "status">) => m.status === "finished";
/** Partida cujo placar deve ser exibido (em andamento ou encerrada). */
export const hasScore = (m: Pick<Match, "status">) => isLive(m) || isFinished(m);

export type MatchOutcome =
  | { kind: "pending" }
  | { kind: "draw" }
  | { kind: "decided"; winnerId: string; loserId: string; byPenalties: boolean };

/** Resultado de uma partida encerrada. Em mata-mata, empates são decididos
 * nos pênaltis quando informados; sem pênaltis, o vencedor fica indefinido. */
export function outcomeOf(match: Match, events: readonly MatchEvent[]): MatchOutcome {
  if (!isFinished(match) || !match.home_team_id || !match.away_team_id) return { kind: "pending" };
  const s = scoreOf(match, events);
  const decide = (homeWins: boolean, byPenalties: boolean): MatchOutcome => ({
    kind: "decided",
    winnerId: homeWins ? match.home_team_id! : match.away_team_id!,
    loserId: homeWins ? match.away_team_id! : match.home_team_id!,
    byPenalties,
  });
  if (s.home !== s.away) return decide(s.home > s.away, false);
  if (
    match.phase === "knockout" &&
    match.home_penalties != null &&
    match.away_penalties != null &&
    match.home_penalties !== match.away_penalties
  ) {
    return decide(match.home_penalties > match.away_penalties, true);
  }
  return { kind: "draw" };
}

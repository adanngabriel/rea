import { isFinished } from "./score";
import { sortMatches, type Snapshot } from "./snapshot";
import type { Match } from "./types";

export type SuspensionSource = "yellow" | "red" | "manual";

export interface SuspensionEntry {
  /** Identificador estável de uma suspensão automática (usado para anulá-la). */
  key: string;
  source: SuspensionSource;
  triggerMatchId: string | null;
  matches: number;
  served: number;
  remaining: number;
  reason: string;
  voided: boolean;
  /** Registro manual correspondente (suspensão manual ou anulação). */
  recordId: string | null;
}

export interface DisciplineStatus {
  playerId: string;
  teamId: string | null;
  yellow: number;
  red: number;
  entries: SuspensionEntry[];
  remaining: number;
  suspended: boolean;
  /** Próxima partida do time que o jogador cumpre suspensão. */
  nextMissedMatchId: string | null;
}

/**
 * Suspensões derivadas das regras configuradas + decisões manuais.
 * Cada suspensão é cumprida nas partidas ENCERRADAS do time do jogador
 * posteriores ao fato gerador; suspensões acumuladas são cumpridas em
 * sequência, não em paralelo.
 */
export function computeDiscipline(s: Snapshot): Map<string, DisciplineStatus> {
  const { discipline } = s.rules;
  const ordered = sortMatches(
    s.matches.filter((m) => m.status !== "cancelled"),
    s.rounds,
  );
  const position = new Map(ordered.map((m, i) => [m.id, i]));
  const voids = new Map(
    s.suspensions.filter((x) => x.kind === "void_auto").map((x) => [x.auto_key!, x]),
  );
  const cardsByPlayer = new Map<string, { matchId: string; yellow: number; red: number }[]>();
  const finished = new Set(s.matches.filter(isFinished).map((m) => m.id));
  for (const e of s.events) {
    if (!e.player_id || (e.type !== "yellow" && e.type !== "red") || !finished.has(e.match_id)) continue;
    const list = cardsByPlayer.get(e.player_id) ?? [];
    let row = list.find((r) => r.matchId === e.match_id);
    if (!row) list.push((row = { matchId: e.match_id, yellow: 0, red: 0 }));
    row[e.type]++;
    cardsByPlayer.set(e.player_id, list);
  }

  const result = new Map<string, DisciplineStatus>();
  for (const reg of s.registrations) {
    const playerId = reg.player_id;
    const teamId = reg.team_id;
    const cards = (cardsByPlayer.get(playerId) ?? []).sort(
      (a, b) => (position.get(a.matchId) ?? 0) - (position.get(b.matchId) ?? 0),
    );
    const pending: { entry: SuspensionEntry; start: number }[] = [];
    let yellowTotal = 0;
    let redTotal = 0;
    let accumulated = 0;
    let yellowCount = 0;
    for (const c of cards) {
      yellowTotal += c.yellow;
      redTotal += c.red;
      const yellowsCounting = c.red > 0 && discipline.redCancelsSameMatchYellows ? 0 : c.yellow;
      const start = (position.get(c.matchId) ?? -1) + 1;
      if (discipline.yellowsForSuspension) {
        accumulated += yellowsCounting;
        while (accumulated >= discipline.yellowsForSuspension) {
          accumulated -= discipline.yellowsForSuspension;
          yellowCount++;
          const key = `${playerId}:${c.matchId}:yellow:${yellowCount}`;
          pending.push({
            start,
            entry: autoEntry(key, "yellow", c.matchId, discipline.yellowSuspensionMatches,
              `${discipline.yellowsForSuspension} cartões amarelos`, voids.get(key)),
          });
        }
      }
      if (c.red > 0 && discipline.redSuspensionMatches) {
        const key = `${playerId}:${c.matchId}:red`;
        pending.push({
          start,
          entry: autoEntry(key, "red", c.matchId, discipline.redSuspensionMatches, "Cartão vermelho", voids.get(key)),
        });
      }
    }
    for (const manual of s.suspensions) {
      if (manual.kind !== "manual" || manual.player_id !== playerId) continue;
      pending.push({
        start: manualStart(manual.from_match_id, manual.created_at, ordered, position, teamId),
        entry: {
          key: `manual:${manual.id}`,
          source: "manual",
          triggerMatchId: manual.from_match_id,
          matches: manual.matches!,
          served: 0,
          remaining: manual.matches!,
          reason: manual.reason,
          voided: false,
          recordId: manual.id,
        },
      });
    }
    pending.sort((a, b) => a.start - b.start);

    // Cumprimento sequencial nas partidas encerradas do time.
    const teamMatches = ordered
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => teamId && (m.home_team_id === teamId || m.away_team_id === teamId));
    let cursor = -1;
    let nextMissedMatchId: string | null = null;
    for (const { entry, start } of pending) {
      if (entry.voided) continue;
      for (const { m, i } of teamMatches) {
        if (entry.served >= entry.matches) break;
        if (i < start || i <= cursor) continue;
        if (!isFinished(m)) break;
        entry.served++;
        cursor = i;
      }
      entry.remaining = entry.matches - entry.served;
      if (entry.remaining > 0 && !nextMissedMatchId) {
        nextMissedMatchId =
          teamMatches.find(({ m, i }) => i >= start && i > cursor && !isFinished(m))?.m.id ?? null;
      }
    }
    const remaining = pending.reduce((sum, p) => sum + (p.entry.voided ? 0 : p.entry.remaining), 0);
    result.set(playerId, {
      playerId,
      teamId,
      yellow: yellowTotal,
      red: redTotal,
      entries: pending.map((p) => p.entry),
      remaining,
      suspended: remaining > 0,
      nextMissedMatchId,
    });
  }
  return result;
}

function autoEntry(
  key: string,
  source: SuspensionSource,
  matchId: string,
  matches: number,
  reason: string,
  voidRecord: { id: string; reason: string } | undefined,
): SuspensionEntry {
  return {
    key,
    source,
    triggerMatchId: matchId,
    matches,
    served: 0,
    remaining: voidRecord ? 0 : matches,
    reason: voidRecord ? `${reason} — anulada: ${voidRecord.reason}` : reason,
    voided: Boolean(voidRecord),
    recordId: voidRecord?.id ?? null,
  };
}

/** Uma suspensão manual começa depois da partida indicada; sem partida,
 * depois do último jogo do time encerrado antes do registro. */
function manualStart(
  fromMatchId: string | null,
  createdAt: string,
  ordered: readonly Match[],
  position: Map<string, number>,
  teamId: string | null,
): number {
  if (fromMatchId && position.has(fromMatchId)) return position.get(fromMatchId)! + 1;
  const created = Date.parse(createdAt);
  let start = 0;
  ordered.forEach((m, i) => {
    if (
      teamId &&
      (m.home_team_id === teamId || m.away_team_id === teamId) &&
      m.finished_at &&
      Date.parse(m.finished_at) <= created
    ) {
      start = i + 1;
    }
  });
  return start;
}

export function disciplineConfigured(s: Pick<Snapshot, "rules">): boolean {
  return s.rules.discipline.yellowsForSuspension != null || s.rules.discipline.redSuspensionMatches != null;
}

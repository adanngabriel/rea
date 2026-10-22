import { calendarDateToIso } from "@/lib/format";
import { isLive } from "./score";
import { sortMatches, type Snapshot } from "./snapshot";
import type { Match } from "./types";

export const STATUS_LABELS: Record<Match["status"], string> = {
  scheduled: "Agendado",
  live: "Em andamento",
  halftime: "Intervalo",
  finished: "Encerrado",
  postponed: "Adiado",
  cancelled: "Cancelado",
};

export function orderedMatches(s: Pick<Snapshot, "matches" | "rounds">): Match[] {
  return sortMatches(s.matches, s.rounds);
}

export function liveMatches(s: Pick<Snapshot, "matches" | "rounds">): Match[] {
  return orderedMatches(s).filter(isLive);
}

/** Próximas partidas: agendadas ou adiadas, em ordem cronológica. */
export function upcomingMatches(s: Pick<Snapshot, "matches" | "rounds">): Match[] {
  return orderedMatches(s).filter((m) => m.status === "scheduled" || m.status === "postponed");
}

export function finishedMatches(s: Pick<Snapshot, "matches" | "rounds">): Match[] {
  return orderedMatches(s)
    .filter((m) => m.status === "finished")
    .reverse();
}

/** Destaque da home: jogo ao vivo; senão o próximo agendado. */
export function featuredMatch(s: Pick<Snapshot, "matches" | "rounds">): Match | null {
  return liveMatches(s)[0] ?? upcomingMatches(s).find((m) => m.status === "scheduled") ?? null;
}

export type CountdownTarget =
  | { kind: "tournament-start"; at: string }
  | { kind: "next-match"; at: string; matchId: string }
  | null;

/** Antes do torneio conta até o início; depois, até o próximo jogo com
 * horário definido. */
export function countdownTarget(s: Snapshot, now = Date.now()): CountdownTarget {
  const next = upcomingMatches(s).find((m) => m.status === "scheduled" && m.scheduled_at && Date.parse(m.scheduled_at) > now);
  const anyStarted = s.matches.some((m) => m.status !== "scheduled" && m.status !== "postponed" && m.status !== "cancelled");
  if (!anyStarted) {
    const firstKickoff = next?.scheduled_at;
    if (firstKickoff) return { kind: "tournament-start", at: firstKickoff };
    if (s.edition.starts_on) {
      // Sem horário cadastrado, conta até o início do dia de abertura (horário do torneio).
      const at = calendarDateToIso(s.edition.starts_on);
      if (Date.parse(at) > now) return { kind: "tournament-start", at };
    }
    return null;
  }
  return next?.scheduled_at ? { kind: "next-match", at: next.scheduled_at, matchId: next.id } : null;
}

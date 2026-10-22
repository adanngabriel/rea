import type { BracketSlot, BracketSource } from "./rules";
import { outcomeOf } from "./score";
import type { Snapshot } from "./snapshot";
import { computeStandings, isGroupStageComplete } from "./standings";
import type { Match } from "./types";

export interface ResolvedSide {
  source: BracketSource;
  /** Texto do lado enquanto o time não é conhecido: "1º colocado". */
  placeholder: string;
  /** Time definido pelas regras, quando já é possível determinar. */
  teamId: string | null;
}

export interface BracketNode {
  slot: BracketSlot;
  match: Match | null;
  home: ResolvedSide;
  away: ResolvedSide;
  /** Profundidade (0 = primeira fase do mata-mata). */
  depth: number;
  isFinal: boolean;
}

export function sourceLabel(source: BracketSource, slots: readonly BracketSlot[]): string {
  if (source.type === "position") return `${source.position}º colocado`;
  const label = slots.find((s) => s.key === source.slot)?.label ?? source.slot;
  return source.type === "winner" ? `Vencedor ${label}` : `Perdedor ${label}`;
}

export interface QualificationMark {
  label: string;
  /** "direct": vai direto ao jogo decisivo; "qualify": entra em fase anterior. */
  tone: "direct" | "qualify";
}

/** Posições da classificação que avançam ao mata-mata, com o destino. */
export function qualificationMarks(slots: readonly BracketSlot[]): Map<number, QualificationMark> {
  const referenced = new Set(slots.flatMap((s) => [s.home, s.away]).flatMap((x) => (x.type === "position" ? [] : [x.slot])));
  const out = new Map<number, QualificationMark>();
  for (const slot of slots) {
    for (const side of [slot.home, slot.away]) {
      if (side.type === "position") {
        out.set(side.position, { label: slot.label, tone: referenced.has(slot.key) ? "qualify" : "direct" });
      }
    }
  }
  return out;
}

/**
 * Resolve o chaveamento a partir das regras: posições só são preenchidas
 * quando a fase classificatória termina; vencedores/perdedores quando a
 * partida de origem tem resultado definido.
 */
export function resolveBracket(s: Snapshot): BracketNode[] {
  const slots = s.rules.knockout.slots;
  if (slots.length === 0) return [];
  const bySlot = new Map(s.matches.filter((m) => m.bracket_slot).map((m) => [m.bracket_slot!, m]));
  const complete = isGroupStageComplete(s.matches);
  const standings = complete ? computeStandings(s.teams, s.matches, s.events, s.rules) : [];

  const depth = new Map<string, number>();
  const referenced = new Set<string>();
  for (const slot of slots) {
    let d = 0;
    for (const side of [slot.home, slot.away]) {
      if (side.type !== "position") {
        referenced.add(side.slot);
        d = Math.max(d, (depth.get(side.slot) ?? 0) + 1);
      }
    }
    depth.set(slot.key, d);
  }

  const resolveSource = (source: BracketSource): string | null => {
    if (source.type === "position") {
      const row = standings[source.position - 1];
      return row && !row.unresolvedTie ? row.team.id : null;
    }
    const match = bySlot.get(source.slot);
    if (!match) return null;
    const outcome = outcomeOf(match, s.events);
    if (outcome.kind !== "decided") return null;
    return source.type === "winner" ? outcome.winnerId : outcome.loserId;
  };

  return slots.map((slot) => ({
    slot,
    match: bySlot.get(slot.key) ?? null,
    home: { source: slot.home, placeholder: sourceLabel(slot.home, slots), teamId: resolveSource(slot.home) },
    away: { source: slot.away, placeholder: sourceLabel(slot.away, slots), teamId: resolveSource(slot.away) },
    depth: depth.get(slot.key) ?? 0,
    isFinal: !referenced.has(slot.key) && slot === lastRoot(slots, referenced),
  }));
}

function lastRoot(slots: readonly BracketSlot[], referenced: Set<string>): BracketSlot | undefined {
  // A final é o jogo mais profundo que não alimenta nenhum outro (ignora
  // disputas de 3º lugar, que costumam ser rasas e cadastradas antes).
  const roots = slots.filter((s) => !referenced.has(s.key));
  return roots.find((s) => /final/i.test(s.label) && !/3|terceiro/i.test(s.label)) ?? roots[roots.length - 1];
}

/** O que a sincronização deve gravar em cada partida do mata-mata. */
export interface BracketSyncPlan {
  create: { slot: BracketSlot; home: string | null; away: string | null }[];
  update: { matchId: string; home: string | null; away: string | null }[];
}

export function planBracketSync(s: Snapshot): BracketSyncPlan {
  const plan: BracketSyncPlan = { create: [], update: [] };
  for (const node of resolveBracket(s)) {
    if (!node.match) {
      plan.create.push({ slot: node.slot, home: node.home.teamId, away: node.away.teamId });
      continue;
    }
    // Ajuste manual tem prioridade; partidas já iniciadas não mudam.
    if (node.match.teams_locked || node.match.status !== "scheduled") continue;
    const home = node.home.teamId;
    const away = node.away.teamId;
    if (home === away && home !== null) continue;
    if (home !== node.match.home_team_id || away !== node.match.away_team_id) {
      plan.update.push({ matchId: node.match.id, home, away });
    }
  }
  return plan;
}

/** Campeão e vice segundo o resultado da final, quando encerrada. */
export function finalOutcome(s: Snapshot): { championId: string; runnerUpId: string; match: Match } | null {
  const final = resolveBracket(s).find((n) => n.isFinal);
  if (!final?.match) return null;
  const outcome = outcomeOf(final.match, s.events);
  if (outcome.kind !== "decided") return null;
  return { championId: outcome.winnerId, runnerUpId: outcome.loserId, match: final.match };
}

/** Campeão oficial: premiação cadastrada pela organização ou, na falta
 * dela, o vencedor da final. */
export function championOf(s: Snapshot): { championId: string; runnerUpId: string | null } | null {
  const award = (category: "champion" | "runner_up") => s.awards.find((a) => a.category === category && a.team_id)?.team_id ?? null;
  const fromFinal = finalOutcome(s);
  const championId = award("champion") ?? fromFinal?.championId ?? null;
  if (!championId) return null;
  const runnerUpId = award("runner_up") ?? (fromFinal?.championId === championId ? fromFinal.runnerUpId : null);
  return { championId, runnerUpId };
}

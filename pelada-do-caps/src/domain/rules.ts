import { z } from "zod";

// Regras da edição (editions.rules). São lidas e validadas apenas aqui; o
// restante do sistema consome o objeto já interpretado. Valores ausentes
// significam "não definido pela organização" — nunca uma regra inventada.

export const TIEBREAKERS = [
  "points",
  "wins",
  "goal_difference",
  "goals_for",
  "head_to_head",
  "fewer_goals_against",
  "fair_play",
  "manual_order",
] as const;
export type Tiebreaker = (typeof TIEBREAKERS)[number];

export const TIEBREAKER_LABELS: Record<Tiebreaker, string> = {
  points: "Pontos",
  wins: "Vitórias",
  goal_difference: "Saldo de gols",
  goals_for: "Gols pró",
  head_to_head: "Confronto direto",
  fewer_goals_against: "Menos gols sofridos",
  fair_play: "Disciplina (menos cartões)",
  manual_order: "Sorteio / decisão da organização",
};

const sourceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("position"), position: z.number().int().min(1).max(64) }),
  z.object({ type: z.literal("winner"), slot: z.string().min(1).max(16) }),
  z.object({ type: z.literal("loser"), slot: z.string().min(1).max(16) }),
]);
export type BracketSource = z.infer<typeof sourceSchema>;

const slotSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(16)
    .regex(/^[A-Za-z0-9_-]+$/, "Use apenas letras, números, - ou _"),
  label: z.string().min(1).max(60),
  roundId: z.string().uuid().nullable().default(null),
  home: sourceSchema,
  away: sourceSchema,
});
export type BracketSlot = z.infer<typeof slotSchema>;

export const KNOCKOUT_PRESETS = ["none", "final_top2", "final_top1_semi_2v3", "semis_1v4_2v3", "custom"] as const;
export type KnockoutPreset = (typeof KNOCKOUT_PRESETS)[number];

const intOrNull = (min: number, max: number) => z.number().int().min(min).max(max).nullable().default(null);

export const rulesSchema = z.object({
  points: z
    .object({
      win: z.number().int().min(0).max(10).default(3),
      draw: z.number().int().min(0).max(10).default(1),
      loss: z.number().int().min(0).max(10).default(0),
    })
    .default({ win: 3, draw: 1, loss: 0 }),
  tiebreakers: z
    .array(z.enum(TIEBREAKERS))
    .refine((list) => new Set(list).size === list.length, "Critério repetido")
    .default(["points", "wins", "goal_difference", "goals_for", "head_to_head"]),
  manualOrder: z.array(z.string().uuid()).default([]),
  discipline: z
    .object({
      yellowsForSuspension: intOrNull(1, 20),
      yellowSuspensionMatches: z.number().int().min(1).max(10).default(1),
      redSuspensionMatches: intOrNull(1, 10),
      redCancelsSameMatchYellows: z.boolean().default(true),
    })
    .default({
      yellowsForSuspension: null,
      yellowSuspensionMatches: 1,
      redSuspensionMatches: null,
      redCancelsSameMatchYellows: true,
    }),
  knockout: z
    .object({
      preset: z.enum(KNOCKOUT_PRESETS).default("none"),
      slots: z.array(slotSchema).max(32).default([]),
    })
    .default({ preset: "none", slots: [] }),
  matchDurationMinutes: intOrNull(1, 240),
  maxPlayersPerTeam: intOrNull(1, 60),
});

export type Rules = z.infer<typeof rulesSchema>;

export type RulesParse = { ok: true; rules: Rules } | { ok: false; rules: Rules; issues: string[] };

/** Interpreta as regras armazenadas. Em caso de dado inválido, mantém os
 * padrões e informa os problemas para o painel exibir. */
export function parseRules(raw: unknown): RulesParse {
  const parsed = rulesSchema.safeParse(raw ?? {});
  if (parsed.success) {
    const issues = validateBracket(parsed.data.knockout.slots);
    return issues.length ? { ok: false, rules: { ...parsed.data, knockout: { preset: "none", slots: [] } }, issues } : { ok: true, rules: parsed.data };
  }
  return {
    ok: false,
    rules: rulesSchema.parse({}),
    issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
  };
}

/** Garante que o chaveamento referencia apenas jogos anteriores existentes. */
export function validateBracket(slots: BracketSlot[]): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const slot of slots) {
    if (seen.has(slot.key)) issues.push(`Jogo "${slot.key}" repetido`);
    for (const side of [slot.home, slot.away]) {
      if (side.type !== "position" && !seen.has(side.slot)) {
        issues.push(`"${slot.label}" depende de "${side.slot}", que precisa vir antes`);
      }
    }
    seen.add(slot.key);
  }
  const consumed = new Map<string, number>();
  for (const slot of slots) {
    for (const side of [slot.home, slot.away]) {
      const key = side.type === "position" ? `p${side.position}` : `${side.type}:${side.slot}`;
      consumed.set(key, (consumed.get(key) ?? 0) + 1);
    }
  }
  for (const [key, count] of consumed) {
    if (count > 1) issues.push(`A mesma origem (${key}) foi usada ${count} vezes`);
  }
  return issues;
}

/** Modelos prontos de mata-mata. São apenas atalhos para preencher slots. */
export function presetSlots(preset: KnockoutPreset, finalRoundId: string | null, semiRoundId: string | null): BracketSlot[] {
  const pos = (position: number) => ({ type: "position" as const, position });
  const winner = (slot: string) => ({ type: "winner" as const, slot });
  switch (preset) {
    case "final_top2":
      return [{ key: "F", label: "Final", roundId: finalRoundId, home: pos(1), away: pos(2) }];
    case "final_top1_semi_2v3":
      return [
        { key: "SF", label: "Semifinal", roundId: semiRoundId, home: pos(2), away: pos(3) },
        { key: "F", label: "Final", roundId: finalRoundId, home: pos(1), away: winner("SF") },
      ];
    case "semis_1v4_2v3":
      return [
        { key: "SF1", label: "Semifinal 1", roundId: semiRoundId, home: pos(1), away: pos(4) },
        { key: "SF2", label: "Semifinal 2", roundId: semiRoundId, home: pos(2), away: pos(3) },
        { key: "F", label: "Final", roundId: finalRoundId, home: winner("SF1"), away: winner("SF2") },
      ];
    case "none":
    case "custom":
      return [];
  }
}

export const KNOCKOUT_PRESET_LABELS: Record<KnockoutPreset, string> = {
  none: "A definir",
  final_top2: "Modelo A — 1º × 2º na final",
  final_top1_semi_2v3: "Modelo B — 1º direto na final; semifinal 2º × 3º",
  semis_1v4_2v3: "Modelo C — Semifinais 1º × 4º e 2º × 3º, depois final",
  custom: "Personalizado",
};

"use server";

import { z } from "zod";
import { KNOCKOUT_PRESETS, parseRules, rulesSchema, TIEBREAKERS, validateBracket, type BracketSlot, type Rules } from "@/domain/rules";
import { slugify } from "@/lib/format";
import { syncBracket } from "./_bracket";
import {
  adminAction,
  idSchema,
  must,
  optionalDate,
  optionalInt,
  optionalText,
  parseForm,
  requiredText,
  storageUrl,
  uniqueSlug,
  UserError,
  type ActionContext,
  type ActionResult,
} from "./_lib";

const editionSchema = z.object({
  name: requiredText(120, "Informe o nome"),
  season: optionalText(20),
  edition_number: optionalInt(1, 999),
  venue: optionalText(120),
  venue_address: optionalText(200),
  starts_on: optionalDate,
  ends_on: optionalDate,
  status: z.enum(["upcoming", "ongoing", "finished"]),
  description: optionalText(300),
  about: optionalText(10000),
  logo_url: storageUrl,
  hero_image_url: storageUrl,
});

export async function saveEdition(form: FormData): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    const ed = await ctx.edition();
    const data = parseForm(editionSchema, form);
    if (data.starts_on && data.ends_on && data.ends_on < data.starts_on) {
      throw new UserError("A data final precisa ser depois da inicial.", { ends_on: "Data final antes da inicial" });
    }
    must(await ctx.db.from("editions").update(data).eq("id", ed.id));
    await ctx.audit({ action: "edition.update", entity: "edition", entityId: ed.id, summary: `Dados do campeonato atualizados (${data.name})`, after: data });
    return { ok: true, message: "Campeonato atualizado." };
  });
}

const roundSchema = z.object({
  name: requiredText(60, "Informe o nome da rodada"),
  phase: z.enum(["group", "knockout"]),
  scheduled_on: optionalDate,
  sort_order: z.coerce.number().int().min(0).max(999),
  notes: optionalText(300),
});

export async function saveRound(id: string | null, form: FormData): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    const ed = await ctx.edition();
    const data = parseForm(roundSchema, form);
    if (id) {
      idSchema.parse(id);
      must(await ctx.db.from("rounds").update(data).eq("id", id));
    } else {
      must(await ctx.db.from("rounds").insert({ ...data, edition_id: ed.id }));
    }
    await ctx.audit({ action: id ? "round.update" : "round.create", entity: "round", entityId: id, summary: `Rodada ${data.name} ${id ? "atualizada" : "criada"}`, after: data });
    return { ok: true, message: "Rodada salva." };
  });
}

export async function deleteRound(id: string): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    idSchema.parse(id);
    const round = must(await ctx.db.from("rounds").select("name").eq("id", id).single()) as { name: string };
    must(await ctx.db.from("rounds").delete().eq("id", id));
    await ctx.audit({ action: "round.delete", entity: "round", entityId: id, summary: `Rodada ${round.name} excluída (jogos ficaram sem rodada)` });
    return { ok: true, message: "Rodada excluída." };
  });
}

// ---------------------------------------------------------------------
// Regras (editions.rules) — cada seção do painel salva só a sua parte.
// ---------------------------------------------------------------------

async function updateRules(ctx: ActionContext, change: (rules: Rules) => Rules, summary: string) {
  const ed = await ctx.edition();
  const current = parseRules(ed.rules).rules;
  const next = rulesSchema.parse(change(current));
  const issues = validateBracket(next.knockout.slots);
  if (issues.length) throw new UserError(issues.join(" • "));
  must(await ctx.db.from("editions").update({ rules: next }).eq("id", ed.id));
  ed.rules = next;
  await ctx.audit({ action: "rules.update", entity: "edition", entityId: ed.id, summary, before: current, after: next });
}

const scoringSchema = z.object({
  win: z.coerce.number().int().min(0).max(10),
  draw: z.coerce.number().int().min(0).max(10),
  loss: z.coerce.number().int().min(0).max(10),
});

export async function saveScoringRules(form: FormData): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    const points = parseForm(scoringSchema, form);
    const tiebreakers = z
      .array(z.enum(TIEBREAKERS))
      .min(1, "Escolha ao menos um critério")
      .parse(form.getAll("tiebreakers").map(String).filter(Boolean));
    if (new Set(tiebreakers).size !== tiebreakers.length) throw new UserError("Há critérios repetidos na lista.");
    const manualOrder = form.getAll("manualOrder").map(String).filter(Boolean).map((id) => idSchema.parse(id));
    await updateRules(ctx, (r) => ({ ...r, points, tiebreakers, manualOrder }), `Pontuação/desempate: V${points.win} E${points.draw} D${points.loss}`);
    await syncBracket(ctx);
    return { ok: true, message: "Regras de classificação salvas. Tabela recalculada." };
  });
}

const generalSchema = z.object({ matchDurationMinutes: optionalInt(1, 240), maxPlayersPerTeam: optionalInt(1, 60) });

export async function saveGeneralRules(form: FormData): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    const data = parseForm(generalSchema, form);
    await updateRules(ctx, (r) => ({ ...r, ...data }), "Regras gerais atualizadas");
    return { ok: true, message: "Regras gerais salvas." };
  });
}

const disciplineSchema = z.object({
  yellowsForSuspension: optionalInt(1, 20),
  yellowSuspensionMatches: z.coerce.number().int().min(1).max(10),
  redSuspensionMatches: optionalInt(1, 10),
  redCancelsSameMatchYellows: z.string().optional().transform((v) => v === "on"),
});

export async function saveDisciplineRules(form: FormData): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    const discipline = parseForm(disciplineSchema, form);
    await updateRules(ctx, (r) => ({ ...r, discipline }), "Regras disciplinares atualizadas");
    return { ok: true, message: "Regras disciplinares salvas. Suspensões recalculadas." };
  });
}

const slotSourceSchema = z.string().transform((v, ctx) => {
  const [type, value] = v.split(":");
  if (type === "position" && /^\d+$/.test(value)) return { type: "position" as const, position: Number(value) };
  if ((type === "winner" || type === "loser") && value) return { type, slot: value } as { type: "winner" | "loser"; slot: string };
  ctx.addIssue({ code: "custom", message: "Origem inválida" });
  return z.NEVER;
});

/** Salva o formato do mata-mata (modelo pronto ou personalizado). */
export async function saveKnockout(form: FormData): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    const preset = z.enum(KNOCKOUT_PRESETS).parse(form.get("preset"));
    const count = Math.min(32, Number(form.get("slot_count") ?? 0) || 0);
    const slots: BracketSlot[] = [];
    for (let i = 0; i < count; i++) {
      const get = (k: string) => String(form.get(`slot_${i}_${k}`) ?? "");
      if (get("remove") === "on" || !get("label").trim()) continue;
      slots.push({
        key: get("key").trim() || `J${i + 1}`,
        label: get("label").trim(),
        roundId: get("roundId") || null,
        home: slotSourceSchema.parse(get("home")),
        away: slotSourceSchema.parse(get("away")),
      });
    }
    await updateRules(ctx, (r) => ({ ...r, knockout: { preset: preset === "none" ? "none" : preset, slots: preset === "none" ? [] : slots } }), `Formato do mata-mata: ${preset}`);
    // Remove partidas de mata-mata de jogos que deixaram de existir (se ainda não começaram).
    const ed = await ctx.edition();
    const keys = new Set(preset === "none" ? [] : slots.map((s) => s.key));
    const existing = must(await ctx.db.from("matches").select("id, bracket_slot, status").eq("edition_id", ed.id).not("bracket_slot", "is", null)) as {
      id: string;
      bracket_slot: string;
      status: string;
    }[];
    const stale = existing.filter((m) => !keys.has(m.bracket_slot));
    const blocked = stale.filter((m) => m.status !== "scheduled");
    if (blocked.length) throw new UserError("Há jogos do mata-mata já iniciados que não existem no novo formato. Ajuste-os antes.");
    if (stale.length) must(await ctx.db.from("matches").delete().in("id", stale.map((m) => m.id)));
    // Atualiza nomes e rodadas dos jogos existentes.
    for (const slot of preset === "none" ? [] : slots) {
      const m = existing.find((x) => x.bracket_slot === slot.key);
      if (m) must(await ctx.db.from("matches").update({ label: slot.label, round_id: slot.roundId }).eq("id", m.id));
    }
    const changed = await syncBracket(ctx);
    return { ok: true, message: `Formato salvo.${changed ? ` ${changed} jogo(s) do chaveamento criado(s)/atualizado(s).` : ""}` };
  });
}

export async function syncBracketNow(): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    const changed = await syncBracket(ctx);
    return { ok: true, message: changed ? `${changed} jogo(s) atualizado(s).` : "O chaveamento já está em dia." };
  });
}

// ---------------------------------------------------------------------
// Edições
// ---------------------------------------------------------------------

const newEditionSchema = z.object({
  name: requiredText(120, "Informe o nome"),
  season: optionalText(20),
  edition_number: optionalInt(1, 999),
  starts_on: optionalDate,
  ends_on: optionalDate,
});

export async function createEdition(form: FormData): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    const data = parseForm(newEditionSchema, form);
    const current = must(await ctx.db.from("editions").select("*").eq("is_current", true).maybeSingle()) as { tournament_id: string; venue: string | null; rules: unknown } | null;
    const tournament = current?.tournament_id ?? (must(await ctx.db.from("tournaments").select("id").limit(1).single()) as { id: string }).id;
    const slug = await uniqueSlug(ctx.db, "editions", slugify(data.season ?? data.name), null);
    const created = must(
      await ctx.db
        .from("editions")
        .insert({ ...data, slug, tournament_id: tournament, venue: current?.venue ?? null, rules: parseRules(current?.rules).rules, is_current: false })
        .select("id")
        .single(),
    ) as { id: string };
    await ctx.audit({ action: "edition.create", entity: "edition", entityId: created.id, editionId: created.id, summary: `Edição ${data.name} criada` });
    return { ok: true, message: "Edição criada. Marque como atual quando quiser trabalhar nela." };
  });
}

export async function setCurrentEdition(id: string): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    idSchema.parse(id);
    must(await ctx.db.from("editions").update({ is_current: false }).eq("is_current", true));
    must(await ctx.db.from("editions").update({ is_current: true }).eq("id", id));
    await ctx.audit({ action: "edition.current", entity: "edition", entityId: id, editionId: id, summary: "Edição atual alterada" });
    return { ok: true, message: "Edição atual alterada." };
  });
}

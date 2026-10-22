"use server";

import { z } from "zod";
import { adminAction, idSchema, must, optionalUuid, parseForm, requiredText, type ActionResult } from "./_lib";

const manualSchema = z.object({
  player_id: z.uuid({ message: "Escolha o jogador" }),
  matches: z.coerce.number().int().min(1, "Mínimo 1 partida").max(20),
  from_match_id: optionalUuid,
  reason: requiredText(500, "Informe a justificativa"),
});

export async function addManualSuspension(form: FormData): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    const ed = await ctx.edition();
    const data = parseForm(manualSchema, form);
    const inserted = must(await ctx.db.from("suspensions").insert({ ...data, edition_id: ed.id, kind: "manual" }).select("id").single()) as { id: string };
    const p = must(await ctx.db.from("players").select("name").eq("id", data.player_id).single()) as { name: string };
    await ctx.audit({ action: "suspension.create", entity: "suspension", entityId: inserted.id, summary: `Suspensão de ${data.matches} jogo(s) para ${p.name}: ${data.reason}`, after: data });
    return { ok: true, message: "Suspensão registrada." };
  });
}

/** Anula uma suspensão automática (ex.: cartão aplicado por engano). */
export async function voidAutoSuspension(playerId: string, autoKey: string, form: FormData): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    const ed = await ctx.edition();
    idSchema.parse(playerId);
    const key = z.string().min(3).max(200).parse(autoKey);
    const reason = requiredText(500, "Informe a justificativa").parse(String(form.get("reason") ?? ""));
    must(await ctx.db.from("suspensions").insert({ edition_id: ed.id, player_id: playerId, kind: "void_auto", auto_key: key, reason }));
    const p = must(await ctx.db.from("players").select("name").eq("id", playerId).single()) as { name: string };
    await ctx.audit({ action: "suspension.void", entity: "suspension", summary: `Suspensão automática de ${p.name} anulada: ${reason}` });
    return { ok: true, message: "Suspensão anulada." };
  });
}

/** Remove uma suspensão manual ou desfaz uma anulação. */
export async function deleteSuspensionRecord(id: string): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    idSchema.parse(id);
    const row = must(await ctx.db.from("suspensions").select("*, players(name)").eq("id", id).single()) as {
      kind: string;
      reason: string;
      players: { name: string } | null;
    };
    must(await ctx.db.from("suspensions").delete().eq("id", id));
    await ctx.audit({
      action: "suspension.delete",
      entity: "suspension",
      entityId: id,
      summary: `${row.kind === "manual" ? "Suspensão manual removida" : "Anulação desfeita"} — ${row.players?.name ?? ""}`,
      before: row,
    });
    return { ok: true, message: "Registro removido." };
  });
}

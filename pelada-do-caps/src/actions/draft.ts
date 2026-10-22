"use server";

import { z } from "zod";
import { adminAction, idSchema, must, UserError, type ActionContext, type ActionResult } from "./_lib";

interface Move {
  player_id: string;
  team_id: string | null;
}

/** Nome do jogador (pela inscrição) e de todos os times, numa única rodada de consultas. */
async function draftLookup(ctx: ActionContext, editionId: string, playerId: string) {
  const [regRes, teamsRes] = await Promise.all([
    ctx.db
      .from("registrations")
      .select("id, team_id, player:players(name, nickname)")
      .eq("edition_id", editionId)
      .eq("player_id", playerId)
      .maybeSingle(),
    ctx.db.from("teams").select("id, name").eq("edition_id", editionId),
  ]);
  const reg = must(regRes) as { id: string; team_id: string | null; player: { name: string; nickname: string | null } | null } | null;
  const teams = must(teamsRes) as { id: string; name: string }[];
  const team = (id: string | null) => (id ? (teams.find((t) => t.id === id)?.name ?? "time") : "Sem time");
  return { reg, player: reg?.player ? reg.player.nickname || reg.player.name : "Jogador", team };
}

/** Coloca, move ou remove um jogador de um time (um passo do sorteio). */
export async function assignPlayer(playerId: string, teamId: string | null): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    idSchema.parse(playerId);
    if (teamId) idSchema.parse(teamId);
    const ed = await ctx.edition();
    const n = await draftLookup(ctx, ed.id, playerId);
    const reg = n.reg;
    if (!reg) throw new UserError("Jogador não está inscrito nesta edição.");
    if (reg.team_id === teamId) return { ok: true, message: "Nada mudou." };
    must(await ctx.db.from("registrations").update({ team_id: teamId }).eq("id", reg.id));
    const summary = teamId
      ? reg.team_id
        ? `${n.player} movido de ${n.team(reg.team_id)} para ${n.team(teamId)}`
        : `${n.player} sorteado para ${n.team(teamId)}`
      : `${n.player} removido de ${n.team(reg.team_id)}`;
    await ctx.audit({
      action: "draft.assign",
      entity: "registration",
      entityId: reg.id,
      summary,
      before: [{ player_id: playerId, team_id: reg.team_id }] satisfies Move[],
      after: [{ player_id: playerId, team_id: teamId }] satisfies Move[],
    });
    return { ok: true, message: summary };
  });
}

/** Desfaz a última alteração da montagem dos times (manual ou automática). */
export async function undoLastDraft(): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    const ed = await ctx.edition();
    const last = must(
      await ctx.db
        .from("audit_logs")
        .select("id, summary, before, after")
        .eq("edition_id", ed.id)
        .in("action", ["draft.assign", "draft.auto"])
        .is("undone_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ) as { id: number; summary: string; before: Move[]; after: Move[] } | null;
    if (!last) throw new UserError("Não há alterações para desfazer.");
    const moves = z.array(z.object({ player_id: z.uuid(), team_id: z.uuid().nullable() })).parse(last.before);
    const expected = new Map((last.after as Move[]).map((m) => [m.player_id, m.team_id]));
    const current = must(
      await ctx.db.from("registrations").select("player_id, team_id").eq("edition_id", ed.id).in("player_id", moves.map((m) => m.player_id)),
    ) as Move[];
    if (current.some((c) => expected.get(c.player_id) !== c.team_id)) {
      throw new UserError("Esse jogador foi alterado depois; ajuste manualmente.");
    }
    for (const m of moves) {
      must(await ctx.db.from("registrations").update({ team_id: m.team_id }).eq("edition_id", ed.id).eq("player_id", m.player_id));
    }
    must(await ctx.db.from("audit_logs").update({ undone_at: new Date().toISOString() }).eq("id", last.id));
    await ctx.audit({ action: "draft.undo", entity: "registration", summary: `Desfeito: ${last.summary}` });
    return { ok: true, message: `Desfeito: ${last.summary}` };
  });
}

/**
 * Ferramenta opcional: distribui os jogadores sem time de forma aleatória,
 * pote a pote, sempre para o time com menos jogadores (goleiros primeiro).
 * Pode ser desfeita de uma vez com "Desfazer".
 */
export async function autoDraft(): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    const ed = await ctx.edition();
    const [teams, regs, players] = await Promise.all([
      ctx.db.from("teams").select("id, name").eq("edition_id", ed.id),
      ctx.db.from("registrations").select("player_id, team_id, pot").eq("edition_id", ed.id),
      ctx.db.from("players").select("id, is_goalkeeper, active"),
    ]);
    const teamRows = must(teams) as { id: string }[];
    if (teamRows.length < 2) throw new UserError("Cadastre ao menos dois times.");
    const regRows = must(regs) as { player_id: string; team_id: string | null; pot: string | null }[];
    const info = new Map((must(players) as { id: string; is_goalkeeper: boolean; active: boolean }[]).map((p) => [p.id, p]));
    const pending = regRows.filter((r) => !r.team_id && info.get(r.player_id)?.active);
    if (pending.length === 0) throw new UserError("Todos os jogadores já têm time.");

    const size = new Map(teamRows.map((t) => [t.id, regRows.filter((r) => r.team_id === t.id).length]));
    const shuffle = <T,>(list: T[]) => {
      const a = [...list];
      for (let i = a.length - 1; i > 0; i--) {
        const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    const groups = new Map<string, typeof pending>();
    for (const r of pending) {
      const key = info.get(r.player_id)?.is_goalkeeper ? "0-gol" : `1-${r.pot ?? "~"}`;
      groups.set(key, [...(groups.get(key) ?? []), r]);
    }
    const moves: Move[] = [];
    for (const key of [...groups.keys()].sort()) {
      for (const r of shuffle(groups.get(key)!)) {
        const min = Math.min(...size.values());
        const target = shuffle([...size].filter(([, n]) => n === min))[0][0];
        size.set(target, size.get(target)! + 1);
        moves.push({ player_id: r.player_id, team_id: target });
      }
    }
    for (const m of moves) {
      must(await ctx.db.from("registrations").update({ team_id: m.team_id }).eq("edition_id", ed.id).eq("player_id", m.player_id));
    }
    await ctx.audit({
      action: "draft.auto",
      entity: "registration",
      summary: `Sorteio automático distribuiu ${moves.length} jogadores`,
      before: moves.map((m) => ({ player_id: m.player_id, team_id: null })),
      after: moves,
    });
    return { ok: true, message: `${moves.length} jogadores distribuídos. Use "Desfazer" se quiser voltar.` };
  });
}

"use server";

import { z } from "zod";
import { scoreOf } from "@/domain/score";
import type { Match, MatchEvent } from "@/domain/types";
import { zonedInputToIso } from "@/lib/format";
import { syncBracket } from "./_bracket";
import {
  adminAction,
  checkbox,
  idSchema,
  must,
  optionalInt,
  optionalText,
  optionalUuid,
  parseForm,
  UserError,
  type ActionContext,
  type ActionResult,
} from "./_lib";

const STATUSES = ["scheduled", "live", "halftime", "finished", "postponed", "cancelled"] as const;
const STATUS_PT: Record<(typeof STATUSES)[number], string> = {
  scheduled: "Agendado",
  live: "Em andamento",
  halftime: "Intervalo",
  finished: "Encerrado",
  postponed: "Adiado",
  cancelled: "Cancelado",
};

const dateTimeLocal = z
  .string()
  .transform((v) => v.trim())
  .transform((v, ctx) => {
    if (v === "") return null;
    try {
      return zonedInputToIso(v);
    } catch {
      ctx.addIssue({ code: "custom", message: "Data/hora inválida" });
      return z.NEVER;
    }
  });

const matchSchema = z
  .object({
    round_id: optionalUuid,
    phase: z.enum(["group", "knockout"]),
    label: optionalText(60),
    home_team_id: optionalUuid,
    away_team_id: optionalUuid,
    scheduled_at: dateTimeLocal,
    venue: optionalText(120),
    status: z.enum(STATUSES),
    teams_locked: checkbox,
    attendance: optionalInt(0, 100000),
    home_penalties: optionalInt(0, 99),
    away_penalties: optionalInt(0, 99),
    notes: optionalText(3000),
  })
  .refine((m) => !m.home_team_id || m.home_team_id !== m.away_team_id, { message: "Escolha times diferentes", path: ["away_team_id"] })
  .refine((m) => (m.home_penalties === null) === (m.away_penalties === null), { message: "Informe os pênaltis dos dois times", path: ["away_penalties"] });

async function loadMatchContext(ctx: ActionContext, matchId: string) {
  idSchema.parse(matchId);
  const [matchRes, eventsRes] = await Promise.all([
    ctx.db.from("matches").select("*").eq("id", matchId).single(),
    ctx.db.from("match_events").select("*").eq("match_id", matchId),
  ]);
  const match = must(matchRes) as Match;
  const events = must(eventsRes) as MatchEvent[];
  const ids = [match.home_team_id, match.away_team_id].filter(Boolean) as string[];
  const teams = ids.length ? (must(await ctx.db.from("teams").select("id, name").in("id", ids)) as { id: string; name: string }[]) : [];
  const name = (id: string | null) => teams.find((t) => t.id === id)?.name ?? "A definir";
  const scoreline = (evs = events) => {
    const s = scoreOf(match, evs);
    return `${name(match.home_team_id)} ${s.home} × ${s.away} ${name(match.away_team_id)}`;
  };
  return { match, events, name, scoreline };
}

export async function saveMatch(id: string | null, form: FormData): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    const ed = await ctx.edition();
    const data = parseForm(matchSchema, form);
    let summary: string;
    let matchId = id;
    if (id) {
      const { match, events, scoreline } = await loadMatchContext(ctx, id);
      const teamsChanged = match.home_team_id !== data.home_team_id || match.away_team_id !== data.away_team_id;
      if (teamsChanged && events.length) {
        throw new UserError("Esta partida já tem eventos na súmula. Remova os eventos antes de trocar os times.");
      }
      must(await ctx.db.from("matches").update(data).eq("id", id));
      summary = `Partida atualizada: ${scoreline()}${match.status !== data.status ? ` — ${STATUS_PT[data.status]}` : ""}`;
    } else {
      const created = must(await ctx.db.from("matches").insert({ ...data, edition_id: ed.id }).select("id").single()) as { id: string };
      matchId = created.id;
      summary = "Nova partida cadastrada";
    }
    await ctx.audit({ action: id ? "match.update" : "match.create", entity: "match", entityId: matchId, summary, after: data });
    await syncBracket(ctx);
    return { ok: true, message: "Partida salva.", redirectTo: id ? undefined : `/admin/jogos/${matchId}/sumula` };
  });
}

export async function deleteMatch(id: string): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    const { scoreline, events } = await loadMatchContext(ctx, id);
    must(await ctx.db.from("matches").delete().eq("id", id));
    await ctx.audit({ action: "match.delete", entity: "match", entityId: id, summary: `Partida excluída: ${scoreline()}`, before: { events } });
    await syncBracket(ctx);
    return { ok: true, message: "Partida excluída.", redirectTo: "/admin/jogos" };
  });
}

export async function setMatchStatus(id: string, status: (typeof STATUSES)[number]): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    z.enum(STATUSES).parse(status);
    const { match, scoreline } = await loadMatchContext(ctx, id);
    if (!match.home_team_id || !match.away_team_id) {
      if (status !== "scheduled" && status !== "postponed" && status !== "cancelled") {
        throw new UserError("Defina os dois times antes de iniciar a partida.");
      }
    }
    must(await ctx.db.from("matches").update({ status }).eq("id", id));
    await ctx.audit({
      action: "match.status",
      entity: "match",
      entityId: id,
      summary: `${scoreline()} — ${STATUS_PT[status]}`,
      before: { status: match.status },
      after: { status },
    });
    const synced = await syncBracket(ctx);
    return { ok: true, message: `Status: ${STATUS_PT[status]}${synced ? " • chaveamento atualizado" : ""}` };
  });
}

const eventSchema = z
  .object({
    type: z.enum(["goal", "own_goal", "yellow", "red"]),
    team_id: z.uuid({ message: "Escolha o time" }),
    player_id: optionalUuid,
    assist_player_id: optionalUuid,
    minute: optionalInt(0, 200),
    notes: optionalText(200),
  })
  .refine((e) => e.type === "goal" || e.player_id, { message: "Escolha o jogador", path: ["player_id"] })
  .refine((e) => e.type === "goal" || !e.assist_player_id, { message: "Assistência só em gol", path: ["assist_player_id"] })
  .refine((e) => !e.assist_player_id || e.assist_player_id !== e.player_id, { message: "Quem deu a assistência não pode ser o autor", path: ["assist_player_id"] });

const EVENT_PT = { goal: "Gol", own_goal: "Gol contra", yellow: "Cartão amarelo", red: "Cartão vermelho", mvp: "Craque do jogo" } as const;

async function playerName(ctx: ActionContext, id: string | null) {
  if (!id) return null;
  const p = must(await ctx.db.from("players").select("name, nickname").eq("id", id).single()) as { name: string; nickname: string | null };
  return p.nickname || p.name;
}

/**
 * Registra um lance da súmula. `team_id` é o time do jogador que
 * participou do lance; para gol contra, o gol é creditado ao adversário.
 */
export async function addEvent(matchId: string, form: FormData): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    const data = parseForm(eventSchema, form);
    const { match, events, name, scoreline } = await loadMatchContext(ctx, matchId);
    const sides = [match.home_team_id, match.away_team_id];
    if (!sides.includes(data.team_id)) throw new UserError("O time precisa ser um dos dois da partida.");
    if (match.status === "scheduled" || match.status === "cancelled" || match.status === "postponed") {
      throw new UserError("Inicie a partida (Em andamento) antes de lançar eventos.");
    }
    const involved = [data.player_id, data.assist_player_id].filter((x): x is string => Boolean(x));
    if (involved.length) {
      const regs = must(
        await ctx.db.from("registrations").select("player_id, team_id").eq("edition_id", match.edition_id).in("player_id", involved),
      ) as { player_id: string; team_id: string | null }[];
      if (involved.some((id) => regs.find((r) => r.player_id === id)?.team_id !== data.team_id)) {
        throw new UserError(`Os jogadores do lance precisam ser do ${name(data.team_id)}.`);
      }
    }
    const credited = data.type === "own_goal" ? sides.find((t) => t !== data.team_id)! : data.team_id;
    const row = { match_id: matchId, type: data.type, team_id: credited, player_id: data.player_id, assist_player_id: data.assist_player_id, minute: data.minute, notes: data.notes };
    const inserted = must(await ctx.db.from("match_events").insert(row).select("*").single()) as MatchEvent;
    const who = (await playerName(ctx, data.player_id)) ?? "autor não identificado";
    const assist = await playerName(ctx, data.assist_player_id);
    const after = scoreline([...events, inserted]);
    await ctx.audit({
      action: "event.create",
      entity: "match_event",
      entityId: inserted.id,
      summary: `${EVENT_PT[data.type]}: ${who} (${name(data.team_id)})${assist ? `, assistência de ${assist}` : ""}${data.minute != null ? ` aos ${data.minute}'` : ""} — ${after}`,
      after: inserted,
    });
    if (match.status === "finished") await syncBracket(ctx);
    return { ok: true, message: `${EVENT_PT[data.type]} registrado. ${data.type === "goal" || data.type === "own_goal" ? after : ""}` };
  });
}

export async function deleteEvent(matchId: string, eventId: string): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    idSchema.parse(eventId);
    const { events, scoreline, name } = await loadMatchContext(ctx, matchId);
    const ev = events.find((e) => e.id === eventId);
    if (!ev) throw new UserError("Evento não encontrado.");
    must(await ctx.db.from("match_events").delete().eq("id", eventId));
    const who = (await playerName(ctx, ev.player_id)) ?? "autor não identificado";
    await ctx.audit({
      action: "event.delete",
      entity: "match_event",
      entityId: eventId,
      summary: `${EVENT_PT[ev.type]} removido: ${who} (${name(ev.team_id)}) — ${scoreline(events.filter((e) => e.id !== eventId))}`,
      before: ev,
    });
    await syncBracket(ctx);
    return { ok: true, message: "Evento removido." };
  });
}

export async function setMvp(matchId: string, form: FormData): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    const playerId = optionalUuid.parse(String(form.get("player_id") ?? ""));
    const { match, events, scoreline } = await loadMatchContext(ctx, matchId);
    const previous = events.find((e) => e.type === "mvp");
    if (previous) must(await ctx.db.from("match_events").delete().eq("id", previous.id));
    if (playerId) {
      const reg = must(
        await ctx.db.from("registrations").select("team_id").eq("edition_id", match.edition_id).eq("player_id", playerId).single(),
      ) as { team_id: string | null };
      if (!reg.team_id || (reg.team_id !== match.home_team_id && reg.team_id !== match.away_team_id)) {
        throw new UserError("O craque do jogo precisa ser de um dos dois times.");
      }
      must(await ctx.db.from("match_events").insert({ match_id: matchId, type: "mvp", team_id: reg.team_id, player_id: playerId }));
    }
    await ctx.audit({
      action: "event.mvp",
      entity: "match",
      entityId: matchId,
      summary: playerId ? `Craque do jogo: ${await playerName(ctx, playerId)} — ${scoreline()}` : `Craque do jogo removido — ${scoreline()}`,
    });
    return { ok: true, message: playerId ? "Craque do jogo definido." : "Craque do jogo removido." };
  });
}

export async function saveLineup(matchId: string, form: FormData): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    const { match, scoreline } = await loadMatchContext(ctx, matchId);
    const chosen = form.getAll("player_id").map((v) => idSchema.parse(String(v)));
    const regs = chosen.length
      ? (must(
          await ctx.db.from("registrations").select("player_id, team_id").eq("edition_id", match.edition_id).in("player_id", chosen),
        ) as { player_id: string; team_id: string | null }[])
      : [];
    const rows = regs
      .filter((r) => r.team_id && (r.team_id === match.home_team_id || r.team_id === match.away_team_id))
      .map((r) => ({ match_id: matchId, player_id: r.player_id, team_id: r.team_id! }));
    must(await ctx.db.from("match_lineups").delete().eq("match_id", matchId));
    if (rows.length) must(await ctx.db.from("match_lineups").insert(rows));
    await ctx.audit({ action: "match.lineup", entity: "match", entityId: matchId, summary: `Escalação registrada (${rows.length} jogadores) — ${scoreline()}` });
    return { ok: true, message: rows.length ? "Escalação salva." : "Escalação limpa: vale o elenco completo." };
  });
}

/**
 * Ferramenta opcional: cria a fase classificatória em todos contra todos
 * (turno único), distribuindo os jogos nas rodadas classificatórias.
 */
export async function generateRoundRobin(): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    const ed = await ctx.edition();
    const [teamsRes, roundsRes, groupRes] = await Promise.all([
      ctx.db.from("teams").select("id, name").eq("edition_id", ed.id).order("sort_order"),
      ctx.db.from("rounds").select("id, phase, sort_order").eq("edition_id", ed.id).eq("phase", "group").order("sort_order"),
      ctx.db.from("matches").select("id", { count: "exact", head: true }).eq("edition_id", ed.id).eq("phase", "group"),
    ]);
    const teams = must(teamsRes) as { id: string }[];
    const rounds = must(roundsRes) as { id: string }[];
    if (groupRes.count) throw new UserError("Já existem jogos da fase classificatória. Exclua-os antes de gerar novamente.");
    if (teams.length < 2) throw new UserError("Cadastre ao menos dois times.");
    // Método do círculo: cada "volta" tem todos os times jogando uma vez.
    const list: (string | null)[] = teams.map((t) => t.id);
    if (list.length % 2) list.push(null);
    const n = list.length;
    const rows: { edition_id: string; round_id: string | null; phase: "group"; home_team_id: string; away_team_id: string; venue: string | null }[] = [];
    for (let r = 0; r < n - 1; r++) {
      for (let i = 0; i < n / 2; i++) {
        const a = list[i];
        const b = list[n - 1 - i];
        if (a && b) {
          rows.push({
            edition_id: ed.id,
            round_id: rounds.length ? rounds[r % rounds.length].id : null,
            phase: "group",
            home_team_id: r % 2 ? b : a,
            away_team_id: r % 2 ? a : b,
            venue: ed.venue,
          });
        }
      }
      list.splice(1, 0, list.pop()!);
    }
    must(await ctx.db.from("matches").insert(rows));
    await ctx.audit({ action: "match.generate", entity: "match", summary: `${rows.length} jogos gerados (todos contra todos)` });
    return { ok: true, message: `${rows.length} jogos criados. Defina os horários em cada partida.` };
  });
}

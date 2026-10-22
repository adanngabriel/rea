import "server-only";
import { planBracketSync } from "@/domain/bracket";
import { parseRules } from "@/domain/rules";
import { loadSnapshot } from "@/lib/data/tournament";
import { must, type ActionContext } from "./_lib";

/**
 * Aplica ao banco o chaveamento definido pelas regras: cria as partidas
 * do mata-mata que faltam e preenche/limpa os times conforme a
 * classificação e os resultados. Partidas travadas (ajuste manual) ou já
 * iniciadas não são alteradas. Retorna quantas partidas mudaram.
 */
export async function syncBracket(ctx: ActionContext): Promise<number> {
  const edition = await ctx.edition();
  // Sem mata-mata configurado não há o que sincronizar (evita uma ida ao banco).
  if (parseRules(edition.rules).rules.knockout.slots.length === 0) return 0;
  const snapshot = await loadSnapshot(ctx.db, edition.slug);
  if (!snapshot) return 0;
  const plan = planBracketSync(snapshot);
  for (const c of plan.create) {
    const round = c.slot.roundId ? snapshot.rounds.find((r) => r.id === c.slot.roundId) : null;
    must(
      await ctx.db.from("matches").insert({
        edition_id: edition.id,
        phase: "knockout",
        bracket_slot: c.slot.key,
        label: c.slot.label,
        round_id: round?.id ?? null,
        home_team_id: c.home,
        away_team_id: c.away,
        venue: edition.venue,
      }),
    );
  }
  for (const u of plan.update) {
    must(await ctx.db.from("matches").update({ home_team_id: u.home, away_team_id: u.away }).eq("id", u.matchId));
  }
  const changed = plan.create.length + plan.update.length;
  if (changed) {
    await ctx.audit({
      action: "bracket.sync",
      entity: "match",
      summary: `Chaveamento atualizado automaticamente (${changed} ${changed === 1 ? "partida" : "partidas"})`,
      after: plan,
    });
  }
  return changed;
}

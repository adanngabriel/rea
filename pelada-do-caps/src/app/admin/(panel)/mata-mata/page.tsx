import type { Metadata } from "next";
import Link from "next/link";
import { syncBracketNow } from "@/actions/edition";
import { ConfirmAction } from "@/components/admin/form";
import { KnockoutEditor } from "@/components/admin/knockout-editor";
import { AdminPageTitle, Notice } from "@/components/admin/page-title";
import { StatusBadge } from "@/components/ui/badges";
import { resolveBracket } from "@/domain/bracket";
import { indexSnapshot } from "@/domain/snapshot";
import { isGroupStageComplete } from "@/domain/standings";
import { adminSnapshot } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Mata-mata" };

export default async function AdminKnockoutPage() {
  const s = await adminSnapshot();
  const nodes = resolveBracket(s);
  const ix = indexSnapshot(s);
  return (
    <>
      <AdminPageTitle
        title="Mata-mata"
        description="Escolha como os classificados avançam. Os jogos são criados automaticamente e os times entram sozinhos quando a fase classificatória termina."
        actions={<ConfirmAction action={syncBracketNow} className="btn-secondary btn-sm">Atualizar chaveamento agora</ConfirmAction>}
      />
      <div className="max-w-5xl space-y-6">
        {!isGroupStageComplete(s.matches) ? (
          <Notice>Enquanto houver jogos da fase classificatória não encerrados, os classificados aparecem como &quot;1º colocado&quot;, &quot;2º colocado&quot;...</Notice>
        ) : null}
        <section className="card p-5 sm:p-6">
          <KnockoutEditor
            initialPreset={s.rules.knockout.preset}
            initialSlots={s.rules.knockout.slots}
            rounds={s.rounds.map((r) => ({ id: r.id, name: r.name, phase: r.phase }))}
            teamCount={s.teams.length}
          />
        </section>
        {nodes.length ? (
          <section className="card p-5 sm:p-6">
            <h2 className="mb-3 font-display text-xl font-extrabold uppercase">Situação dos jogos</h2>
            <ul className="divide-y divide-line">
              {nodes.map((n) => (
                <li key={n.slot.key} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <strong className="w-32">{n.slot.label}</strong>
                  <span className="flex-1">
                    {ix.team(n.match?.home_team_id)?.name ?? n.home.placeholder} × {ix.team(n.match?.away_team_id)?.name ?? n.away.placeholder}
                    {n.match?.teams_locked ? <span className="ml-2 text-xs text-warning">(ajuste manual)</span> : null}
                  </span>
                  {n.match ? (
                    <>
                      <StatusBadge status={n.match.status} />
                      <Link href={`/admin/jogos/${n.match.id}`} className="btn-ghost btn-sm">Ajustar</Link>
                    </>
                  ) : (
                    <span className="text-xs text-muted">Será criado ao salvar</span>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Para um ajuste excepcional, abra o jogo, escolha os times e marque &quot;Travar times&quot;.</p>
          </section>
        ) : null}
      </div>
    </>
  );
}

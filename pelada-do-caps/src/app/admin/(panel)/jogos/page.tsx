import { ClipboardEdit, Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { generateRoundRobin } from "@/actions/matches";
import { ConfirmAction } from "@/components/admin/form";
import { AdminPageTitle, Notice } from "@/components/admin/page-title";
import { StatusBadge } from "@/components/ui/badges";
import { Crest } from "@/components/ui/crest";
import { orderedMatches } from "@/domain/schedule";
import { hasScore, scoreOf } from "@/domain/score";
import { indexSnapshot } from "@/domain/snapshot";
import { adminSnapshot } from "@/lib/data/admin";
import { formatCalendarDate, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Jogos" };

export default async function AdminMatchesPage() {
  const s = await adminSnapshot();
  const ix = indexSnapshot(s);
  const matches = orderedMatches(s);
  const groups = [
    ...s.rounds.map((r) => ({ key: r.id, title: r.name, date: r.scheduled_on, list: matches.filter((m) => m.round_id === r.id) })),
    { key: "none", title: "Sem rodada", date: null, list: matches.filter((m) => !m.round_id) },
  ].filter((g) => g.list.length || g.key !== "none");
  const hasGroup = s.matches.some((m) => m.phase === "group");
  return (
    <>
      <AdminPageTitle
        title="Jogos e súmulas"
        description="Cadastre os confrontos, defina horários e atualize as partidas ao vivo pela súmula."
        actions={
          <>
            <Link href="/admin/jogos/novo" className="btn-primary btn-sm">
              <Plus className="size-4" aria-hidden /> Novo jogo
            </Link>
            {!hasGroup && s.teams.length >= 2 ? (
              <ConfirmAction
                action={generateRoundRobin}
                className="btn-secondary btn-sm"
                confirm="Criar automaticamente todos os confrontos da fase classificatória (todos contra todos, turno único)? Você poderá editar ou excluir cada jogo depois."
              >
                Gerar todos contra todos
              </ConfirmAction>
            ) : null}
          </>
        }
      />
      {s.matches.length === 0 ? (
        <Notice>
          Nenhum jogo cadastrado. Crie cada confronto em &quot;Novo jogo&quot; ou use &quot;Gerar todos contra todos&quot; para montar a fase
          classificatória de uma vez. Os jogos do mata-mata são criados em Mata-mata.
        </Notice>
      ) : null}
      <div className="mt-4 space-y-6">
        {groups.map((g) => (
          <section key={g.key}>
            <h2 className="mb-2 flex items-baseline gap-3 font-display text-xl font-extrabold uppercase">
              {g.title}
              {g.date ? <span className="tabular text-sm font-normal text-muted">{formatCalendarDate(g.date)}</span> : null}
            </h2>
            {g.list.length === 0 ? (
              <p className="text-sm text-muted">Nenhum jogo nesta rodada.</p>
            ) : (
              <ul className="card divide-y divide-line">
                {g.list.map((m) => {
                  const sc = scoreOf(m, s.events);
                  return (
                    <li key={m.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Crest team={ix.team(m.home_team_id)} size={22} />
                          <span className="truncate">{ix.team(m.home_team_id)?.name ?? "A definir"}</span>
                          <span className="tabular px-1 font-display text-lg text-muted">{hasScore(m) ? `${sc.home} × ${sc.away}` : "×"}</span>
                          <span className="truncate">{ix.team(m.away_team_id)?.name ?? "A definir"}</span>
                          <Crest team={ix.team(m.away_team_id)} size={22} />
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          {m.label ? `${m.label} • ` : ""}
                          {m.scheduled_at ? formatDateTime(m.scheduled_at) : "Horário a definir"}
                          {m.teams_locked ? " • times travados manualmente" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={m.status} />
                        <Link href={`/admin/jogos/${m.id}`} className="btn-ghost btn-sm">
                          <Pencil className="size-4" aria-hidden /> Editar
                        </Link>
                        <Link href={`/admin/jogos/${m.id}/sumula`} className="btn-secondary btn-sm">
                          <ClipboardEdit className="size-4" aria-hidden /> Súmula
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
      </div>
    </>
  );
}

import { CalendarDays, ClipboardEdit, Goal, Newspaper, Shuffle, Square, UserPlus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageTitle, Notice } from "@/components/admin/page-title";
import { StatusBadge } from "@/components/ui/badges";
import { Crest } from "@/components/ui/crest";
import { disciplineConfigured } from "@/domain/discipline";
import { featuredMatch, orderedMatches } from "@/domain/schedule";
import { scoreOf } from "@/domain/score";
import { indexSnapshot, matchStageLabel, rosterEntries, teamRoster } from "@/domain/snapshot";
import { totalGoals } from "@/domain/stats";
import { adminRows, adminSnapshot } from "@/lib/data/admin";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

interface AuditRow {
  id: number;
  summary: string;
  created_at: string;
}

export default async function DashboardPage() {
  const s = await adminSnapshot();
  const [recent] = await Promise.all([adminRows<AuditRow>("audit_logs", [{ column: "created_at", ascending: false }], 8)]);
  const ix = indexSnapshot(s);
  const entries = rosterEntries(s);
  const unassigned = entries.filter((e) => !e.registration.team_id).length;
  const played = s.matches.filter((m) => m.status === "finished").length;
  const remaining = s.matches.filter((m) => m.status !== "finished" && m.status !== "cancelled").length;
  const cards = s.events.filter((e) => e.type === "yellow" || e.type === "red").length;
  const next = featuredMatch(s);
  const lastUpdate = recent[0];
  const pendingTimes = orderedMatches(s).filter((m) => !m.scheduled_at && m.status === "scheduled").length;

  const tiles = [
    { label: "Jogadores inscritos", value: entries.length, href: "/admin/jogadores", icon: Users },
    { label: "Sem time", value: unassigned, href: "/admin/sorteio", icon: Shuffle },
    { label: "Jogos realizados", value: played, href: "/admin/jogos", icon: CalendarDays },
    { label: "Jogos restantes", value: remaining, href: "/admin/jogos", icon: CalendarDays },
    { label: "Gols", value: totalGoals(s), href: "/estatisticas", icon: Goal },
    { label: "Cartões", value: cards, href: "/admin/disciplina", icon: Square },
  ];

  return (
    <>
      <AdminPageTitle
        title="Dashboard"
        description={
          <>
            {s.edition.name}
            {lastUpdate ? <> • Última alteração: {formatDateTime(lastUpdate.created_at)}</> : null}
          </>
        }
      />
      <div className="space-y-6">
        {s.rulesIssues.length ? (
          <Notice tone="warning">Há problemas nas regras salvas: {s.rulesIssues.join("; ")}. Revise em Classificação e Mata-mata.</Notice>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/jogadores/novo" className="btn-primary btn-sm">
            <UserPlus className="size-4" aria-hidden /> Adicionar jogador
          </Link>
          <Link href="/admin/noticias/novo" className="btn-secondary btn-sm">
            <Newspaper className="size-4" aria-hidden /> Criar notícia
          </Link>
          {next ? (
            <Link href={`/admin/jogos/${next.id}/sumula`} className="btn-secondary btn-sm">
              <ClipboardEdit className="size-4" aria-hidden /> Atualizar partida
            </Link>
          ) : null}
          <Link href="/admin/sorteio" className="btn-secondary btn-sm">
            <Shuffle className="size-4" aria-hidden /> Montar times
          </Link>
        </div>

        <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {tiles.map(({ label, value, href, icon: Icon }) => (
            <Link key={label} href={href} className="card card-hover p-4">
              <dt className="flex items-center gap-2 text-xs text-muted">
                <Icon className="size-3.5" aria-hidden /> {label}
              </dt>
              <dd className="tabular mt-1 font-display text-4xl font-extrabold">{value}</dd>
            </Link>
          ))}
        </dl>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="card p-5">
            <h2 className="eyebrow mb-3">Próximo jogo</h2>
            {next ? (
              <Link href={`/admin/jogos/${next.id}/sumula`} className="block rounded-xl p-2 hover:bg-surface-2">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-muted">{matchStageLabel(s, next)}</span>
                  <StatusBadge status={next.status} />
                </div>
                <div className="flex items-center gap-3 font-semibold">
                  <Crest team={ix.team(next.home_team_id)} size={28} />
                  {ix.team(next.home_team_id)?.name ?? "A definir"}
                  <span className="tabular font-display text-xl text-muted">
                    {next.status === "scheduled" ? "×" : `${scoreOf(next, s.events).home} × ${scoreOf(next, s.events).away}`}
                  </span>
                  {ix.team(next.away_team_id)?.name ?? "A definir"}
                  <Crest team={ix.team(next.away_team_id)} size={28} />
                </div>
                <p className="mt-2 text-sm text-muted">{next.scheduled_at ? formatDateTime(next.scheduled_at) : "Data e horário a definir"}</p>
              </Link>
            ) : (
              <p className="text-sm text-muted">Nenhum jogo agendado. <Link href="/admin/jogos" className="text-accent underline">Cadastrar jogos</Link></p>
            )}
          </section>

          <section className="card p-5">
            <h2 className="eyebrow mb-3">Jogadores por time</h2>
            <ul className="space-y-2">
              {s.teams.map((t) => {
                const n = teamRoster(entries, t.id).length;
                const max = s.rules.maxPlayersPerTeam ?? Math.max(1, ...s.teams.map((x) => teamRoster(entries, x.id).length));
                return (
                  <li key={t.id} className="flex items-center gap-3 text-sm">
                    <Crest team={t} size={22} />
                    <span className="w-28 truncate">{t.name}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                      <span className="block h-full rounded-full" style={{ width: `${Math.min(100, (n / max) * 100)}%`, background: t.primary_color }} />
                    </span>
                    <span className="tabular w-10 text-right font-semibold">{n}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <section className="card p-5">
          <h2 className="eyebrow mb-3">Pendências</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            {s.teams.some((t) => /^Time \d$/.test(t.name)) ? <li>Times ainda com nome provisório — <Link className="text-accent underline" href="/admin/times">editar times</Link>.</li> : null}
            {pendingTimes ? <li>{pendingTimes} jogo(s) sem data/horário — <Link className="text-accent underline" href="/admin/jogos">definir horários</Link>.</li> : null}
            {s.matches.length === 0 ? <li>Nenhum jogo cadastrado — <Link className="text-accent underline" href="/admin/jogos">criar jogos</Link>.</li> : null}
            {!disciplineConfigured(s) ? <li>Regras de suspensão automática não definidas — <Link className="text-accent underline" href="/admin/disciplina">configurar</Link>.</li> : null}
            {s.rules.knockout.slots.length === 0 ? <li>Formato do mata-mata não definido — <Link className="text-accent underline" href="/admin/mata-mata">configurar</Link>.</li> : null}
            {unassigned ? <li>{unassigned} jogador(es) sem time — <Link className="text-accent underline" href="/admin/sorteio">montagem dos times</Link>.</li> : null}
          </ul>
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="eyebrow">Últimas alterações</h2>
            <Link href="/admin/auditoria" className="text-sm text-accent">Ver histórico</Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma alteração registrada ainda.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {recent.slice(0, 8).map((r) => (
                <li key={r.id} className="flex gap-3 py-2">
                  <span className="tabular w-36 shrink-0 text-muted">{formatDateTime(r.created_at)}</span>
                  <span>{r.summary}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

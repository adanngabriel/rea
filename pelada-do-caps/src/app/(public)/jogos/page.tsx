import { CalendarX2 } from "lucide-react";
import type { Metadata } from "next";
import { LiveRefresher } from "@/components/public/live-refresher";
import { MatchCard } from "@/components/public/match-card";
import { Chips } from "@/components/ui/chips";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/section";
import { orderedMatches } from "@/domain/schedule";
import { currentSnapshot } from "@/lib/data/require";
import { formatCalendarDate } from "@/lib/format";

export const metadata: Metadata = { title: "Jogos", description: "Agenda, resultados e confrontos de todas as rodadas." };

type Filter = "todos" | "proximos" | "encerrados";

export default async function MatchesPage({ searchParams }: { searchParams: Promise<{ status?: string; rodada?: string }> }) {
  const params = await searchParams;
  const s = await currentSnapshot();
  const filter: Filter = params.status === "proximos" || params.status === "encerrados" ? params.status : "todos";
  const roundId = s.rounds.some((r) => r.id === params.rodada) ? params.rodada! : null;

  let matches = orderedMatches(s);
  if (filter === "proximos") matches = matches.filter((m) => m.status !== "finished" && m.status !== "cancelled");
  if (filter === "encerrados") matches = matches.filter((m) => m.status === "finished");
  if (roundId) matches = matches.filter((m) => m.round_id === roundId);

  const groups = [
    ...s.rounds.map((r) => ({ key: r.id, title: r.name, date: r.scheduled_on, matches: matches.filter((m) => m.round_id === r.id) })),
    { key: "none", title: "Outros jogos", date: null, matches: matches.filter((m) => !m.round_id) },
  ].filter((g) => g.matches.length > 0);

  const href = (next: { status?: Filter; rodada?: string | null }) => {
    const q = new URLSearchParams();
    const st = next.status ?? filter;
    const rd = next.rodada === undefined ? roundId : next.rodada;
    if (st !== "todos") q.set("status", st);
    if (rd) q.set("rodada", rd);
    const qs = q.toString();
    return qs ? `/jogos?${qs}` : "/jogos";
  };

  return (
    <>
      <LiveRefresher tables={["matches", "match_events"]} />
      <PageHeader title="Jogos">
        Calendário completo, resultados e confrontos. Toque em uma partida para ver a súmula.
      </PageHeader>
      <div className="container-page space-y-6 py-8">
        <div className="space-y-3">
          <Chips
            label="Situação"
            items={[
              { href: href({ status: "todos" }), label: "Todos", active: filter === "todos" },
              { href: href({ status: "proximos" }), label: "Próximos", active: filter === "proximos" },
              { href: href({ status: "encerrados" }), label: "Encerrados", active: filter === "encerrados" },
            ]}
          />
          {s.rounds.length > 1 ? (
            <Chips
              label="Rodada"
              items={[
                { href: href({ rodada: null }), label: "Todas as rodadas", active: !roundId },
                ...s.rounds.map((r) => ({ href: href({ rodada: r.id }), label: r.name, active: roundId === r.id })),
              ]}
            />
          ) : null}
        </div>
        {groups.length === 0 ? (
          <EmptyState icon={CalendarX2} title="Nenhum jogo encontrado">
            {s.matches.length === 0 ? "Os confrontos ainda não foram cadastrados pela organização." : "Nenhuma partida corresponde a este filtro."}
          </EmptyState>
        ) : (
          groups.map((g) => (
            <section key={g.key} aria-labelledby={`r-${g.key}`}>
              <div className="mb-3 flex items-baseline gap-3">
                <h2 id={`r-${g.key}`} className="font-display text-2xl font-extrabold uppercase">
                  {g.title}
                </h2>
                {g.date ? <span className="tabular text-sm text-muted">{formatCalendarDate(g.date)}</span> : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.matches.map((m) => (
                  <MatchCard key={m.id} s={s} match={m} showStage={false} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}

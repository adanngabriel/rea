import { Shield } from "lucide-react";
import type { Metadata } from "next";
import { LiveRefresher } from "@/components/public/live-refresher";
import { ShareButton } from "@/components/public/share-button";
import { QualificationLegend, StandingsTable } from "@/components/public/standings-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/section";
import { qualificationMarks } from "@/domain/bracket";
import { TIEBREAKER_LABELS } from "@/domain/rules";
import { computeStandings, isGroupStageComplete } from "@/domain/standings";
import { currentSnapshot } from "@/lib/data/require";

export const revalidate = 60;
export const metadata: Metadata = { title: "Classificação", description: "Tabela atualizada automaticamente a cada resultado." };

export default async function StandingsPage() {
  const s = await currentSnapshot();
  const rows = computeStandings(s.teams, s.matches, s.events, s.rules);
  const marks = qualificationMarks(s.rules.knockout.slots);
  const { points } = s.rules;
  return (
    <>
      <LiveRefresher tables={["matches", "match_events"]} />
      <PageHeader title="Classificação" eyebrow={isGroupStageComplete(s.matches) ? "Fase classificatória encerrada" : "Fase classificatória"}>
        Atualizada automaticamente quando cada partida é encerrada.
      </PageHeader>
      <div className="container-page space-y-6 py-8">
        {rows.length === 0 ? (
          <EmptyState icon={Shield} title="Times em breve">
            Os times serão divulgados em breve.
          </EmptyState>
        ) : (
          <>
            <div className="flex justify-end">
              <ShareButton title="Classificação" text={`Classificação — ${s.edition.name}`} path="/classificacao" />
            </div>
            <StandingsTable rows={rows} marks={marks} />
            <QualificationLegend marks={marks} />
            {rows.some((r) => r.unresolvedTie) ? (
              <p className="text-sm text-warning">* Empate não resolvido pelos critérios configurados; a organização definirá a ordem.</p>
            ) : null}
          </>
        )}
        <section className="card grid gap-6 p-5 sm:grid-cols-2" aria-labelledby="h-criterios">
          <div>
            <h2 id="h-criterios" className="eyebrow mb-3">
              Pontuação
            </h2>
            <ul className="space-y-1 text-sm">
              <li>Vitória: <strong>{points.win}</strong> {points.win === 1 ? "ponto" : "pontos"}</li>
              <li>Empate: <strong>{points.draw}</strong> {points.draw === 1 ? "ponto" : "pontos"}</li>
              <li>Derrota: <strong>{points.loss}</strong> {points.loss === 1 ? "ponto" : "pontos"}</li>
            </ul>
          </div>
          <div>
            <h2 className="eyebrow mb-3">Critérios de classificação</h2>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {s.rules.tiebreakers.map((t) => (
                <li key={t}>{TIEBREAKER_LABELS[t]}</li>
              ))}
            </ol>
          </div>
          <p className="text-xs text-muted sm:col-span-2">
            Legenda: P pontos • J jogos • V vitórias • E empates • D derrotas • GP gols pró • GC gols contra • SG saldo de gols
          </p>
        </section>
      </div>
    </>
  );
}

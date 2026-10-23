import { Square } from "lucide-react";
import type { Metadata } from "next";
import { DisciplineTable } from "@/components/public/discipline-table";
import { LiveRefresher } from "@/components/public/live-refresher";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/section";
import { disciplineConfigured } from "@/domain/discipline";
import { currentSnapshot } from "@/lib/data/require";

export const revalidate = 60;
export const metadata: Metadata = { title: "Cartões e suspensões", description: "Controle disciplinar do torneio." };

export default async function CardsPage() {
  const s = await currentSnapshot();
  const { discipline } = s.rules;
  const hasData = s.events.some((e) => e.type === "yellow" || e.type === "red") || s.suspensions.length > 0;
  return (
    <>
      <LiveRefresher tables={["match_events", "matches"]} />
      <PageHeader title="Cartões e suspensões" />
      <div className="container-page space-y-6 py-8">
        <section className="card p-5 text-sm" aria-labelledby="h-regras">
          <h2 id="h-regras" className="eyebrow mb-2">
            Regras disciplinares
          </h2>
          {disciplineConfigured(s) ? (
            <ul className="list-disc space-y-1 pl-5 text-ink/85">
              {discipline.yellowsForSuspension ? (
                <li>
                  {discipline.yellowsForSuspension} cartões amarelos = suspensão de {discipline.yellowSuspensionMatches}{" "}
                  {discipline.yellowSuspensionMatches === 1 ? "partida" : "partidas"}.
                </li>
              ) : null}
              {discipline.redSuspensionMatches ? (
                <li>
                  Cartão vermelho = suspensão automática de {discipline.redSuspensionMatches}{" "}
                  {discipline.redSuspensionMatches === 1 ? "partida" : "partidas"}.
                </li>
              ) : null}
              <li>Decisões da organização podem aplicar ou anular suspensões.</li>
            </ul>
          ) : (
            <p className="text-muted">As regras de suspensão automática ainda não foram definidas pela organização.</p>
          )}
        </section>
        {hasData ? (
          <DisciplineTable s={s} />
        ) : (
          <EmptyState icon={Square} title="Jogo limpo até aqui">
            Nenhum cartão aplicado.
          </EmptyState>
        )}
      </div>
    </>
  );
}

import { Trophy } from "lucide-react";
import type { Metadata } from "next";
import { Crest } from "@/components/ui/crest";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/section";
import { championOf } from "@/domain/bracket";
import { indexSnapshot } from "@/domain/snapshot";
import { leaderboard } from "@/domain/stats";
import { displayName } from "@/domain/snapshot";
import { getAllEditions, getPublicEditionSnapshot } from "@/lib/data/tournament";
import { formatCalendarDate } from "@/lib/format";

export const revalidate = 300;
export const metadata: Metadata = { title: "Hall dos campeões", description: "Todas as edições e seus campeões." };

export default async function HallPage() {
  const editions = await getAllEditions();
  const rows = await Promise.all(
    editions.map(async (edition) => {
      const s = await getPublicEditionSnapshot(edition.slug);
      if (!s) return { edition, champion: null, runnerUp: null, scorer: null };
      const ix = indexSnapshot(s);
      const result = championOf(s);
      const scorer = leaderboard(s, "goals")[0];
      return {
        edition,
        champion: result ? ix.team(result.championId) : null,
        runnerUp: result?.runnerUpId ? ix.team(result.runnerUpId) : null,
        scorer: scorer ? `${displayName(scorer.entry.player)} (${scorer.value})` : null,
      };
    }),
  );
  return (
    <>
      <PageHeader title="Hall dos campeões">
        A história de todas as edições.
      </PageHeader>
      <div className="container-page py-8">
        {rows.length === 0 ? (
          <EmptyState icon={Trophy} title="A história começa agora" />
        ) : (
          <ol className="relative space-y-4 border-l border-line pl-6">
            {rows.map(({ edition, champion, runnerUp, scorer }) => (
              <li key={edition.id} className="relative">
                <span className="absolute -left-[1.95rem] top-5 grid size-4 place-items-center rounded-full border-2 border-gold bg-bg" aria-hidden />
                <article className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <p className="eyebrow">
                      {edition.season ?? ""} {edition.edition_number ? `• ${edition.edition_number}ª edição` : ""}
                    </p>
                    <h2 className="font-display text-2xl font-extrabold uppercase">{edition.name}</h2>
                    <p className="text-sm text-muted">
                      {edition.venue}
                      {edition.starts_on ? ` • ${formatCalendarDate(edition.starts_on)}` : ""}
                    </p>
                  </div>
                  {champion ? (
                    <div className="flex items-center gap-3">
                      <Crest team={champion} size={56} />
                      <div>
                        <p className="eyebrow text-gold">Campeão</p>
                        <p className="font-display text-2xl font-extrabold uppercase">{champion.name}</p>
                        <p className="text-xs text-muted">
                          {runnerUp ? `Vice: ${runnerUp.name}` : ""}
                          {scorer ? `${runnerUp ? " • " : ""}Artilheiro: ${scorer}` : ""}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted">{edition.status === "finished" ? "Campeão não registrado" : "Em disputa"}</p>
                  )}
                </article>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}

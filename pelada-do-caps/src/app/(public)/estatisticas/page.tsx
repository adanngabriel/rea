import { Award, Goal, HandHelping, Square, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DisciplineTable } from "@/components/public/discipline-table";
import { LeaderboardList } from "@/components/public/leaderboard-list";
import { LiveRefresher } from "@/components/public/live-refresher";
import { PlayerAvatar } from "@/components/ui/avatar";
import { Chips } from "@/components/ui/chips";
import { Crest } from "@/components/ui/crest";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/section";
import { displayName, indexSnapshot } from "@/domain/snapshot";
import { computePlayerStats, leaderboard, totalGoals } from "@/domain/stats";
import { currentSnapshot } from "@/lib/data/require";

export const revalidate = 60;
export const metadata: Metadata = { title: "Destaques", description: "Artilharia, assistências, craques do jogo e melhores da rodada." };

const TABS = {
  artilharia: { label: "Artilharia", key: "goals", unit: ["gol", "gols"], empty: "Nenhum gol registrado ainda.", icon: Goal },
  assistencias: { label: "Assistências", key: "assists", unit: ["assist.", "assist."], empty: "Nenhuma assistência registrada ainda.", icon: HandHelping },
  mvp: { label: "Craque do jogo", key: "mvp", unit: ["vez", "vezes"], empty: "Nenhum craque do jogo escolhido ainda.", icon: Star },
  cartoes: { label: "Cartões", key: "yellow", unit: ["amarelo", "amarelos"], empty: "Nenhum cartão aplicado.", icon: Square },
} as const;
type Tab = keyof typeof TABS | "rodada";

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { aba } = await searchParams;
  const tab: Tab = aba && (aba in TABS || aba === "rodada") ? (aba as Tab) : "artilharia";
  const s = await currentSnapshot();
  const stats = computePlayerStats(s);
  const ix = indexSnapshot(s);
  const highlights = s.awards.filter((a) => a.category === "round_highlight");

  return (
    <>
      <LiveRefresher tables={["match_events"]} />
      <PageHeader title="Destaques" eyebrow={totalGoals(s) ? `${totalGoals(s)} gols na competição` : undefined}>
        Rankings calculados automaticamente a partir das súmulas.
      </PageHeader>
      <div className="container-page space-y-6 py-8">
        <Chips
          label="Rankings"
          items={[
            ...Object.entries(TABS).map(([k, v]) => ({ href: `/estatisticas?aba=${k}`, label: v.label, active: tab === k })),
            { href: "/estatisticas?aba=rodada", label: "Melhores da rodada", active: tab === "rodada" },
          ]}
        />
        {tab === "rodada" ? (
          highlights.length === 0 ? (
            <EmptyState icon={Award} title="Em breve">
              A organização publicará aqui os destaques de cada rodada.
            </EmptyState>
          ) : (
            <div className="space-y-6">
              {s.rounds
                .map((r) => ({ round: r, list: highlights.filter((h) => h.round_id === r.id) }))
                .concat([{ round: null as never, list: highlights.filter((h) => !h.round_id) }])
                .filter((g) => g.list.length)
                .map((g) => (
                  <section key={g.round?.id ?? "geral"}>
                    <h2 className="mb-3 font-display text-2xl font-extrabold uppercase">{g.round?.name ?? "Destaques"}</h2>
                    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {g.list.map((h) => {
                        const p = ix.player(h.player_id);
                        const t = ix.team(h.team_id) ?? (p ? ix.team(ix.registration(p.id)?.team_id) : null);
                        return (
                          <li key={h.id} className="card flex items-center gap-3 p-4">
                            {p ? <PlayerAvatar player={p} size={48} ring={t?.primary_color} /> : t ? <Crest team={t} size={48} /> : <Award className="size-8 text-gold" aria-hidden />}
                            <div className="min-w-0">
                              <p className="eyebrow text-gold">{h.title}</p>
                              {p ? (
                                <Link href={`/jogadores/${p.slug}`} className="font-semibold hover:text-accent">
                                  {displayName(p)}
                                </Link>
                              ) : t ? (
                                <p className="font-semibold">{t.name}</p>
                              ) : null}
                              {h.description ? <p className="text-xs text-muted">{h.description}</p> : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
            </div>
          )
        ) : (
          (() => {
            const cfg = TABS[tab];
            if (tab === "cartoes") {
              const table = <DisciplineTable s={s} />;
              return s.events.some((e) => e.type === "yellow" || e.type === "red") || s.suspensions.length ? (
                table
              ) : (
                <EmptyState icon={cfg.icon} title={cfg.label}>
                  {cfg.empty}
                </EmptyState>
              );
            }
            const rows = leaderboard(s, cfg.key, stats);
            if (rows.length === 0) {
              return (
                <EmptyState icon={cfg.icon} title={cfg.label}>
                  {cfg.empty}
                </EmptyState>
              );
            }
            return <LeaderboardList rows={rows} unit={[...cfg.unit]} />;
          })()
        )}
      </div>
    </>
  );
}

import { Shirt } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LiveRefresher } from "@/components/public/live-refresher";
import { PlayerAvatar } from "@/components/ui/avatar";
import { Crest } from "@/components/ui/crest";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/section";
import { displayName, rosterEntries, teamRoster } from "@/domain/snapshot";
import { currentSnapshot } from "@/lib/data/require";

export const revalidate = 60;
export const metadata: Metadata = { title: "Sorteio dos times", description: "Acompanhe ao vivo a formação dos elencos." };

export default async function DrawPage() {
  const s = await currentSnapshot();
  const entries = rosterEntries(s).filter((e) => e.player.active);
  const assigned = entries.filter((e) => e.registration.team_id);
  const waiting = entries.length - assigned.length;
  const latest = [...assigned].sort((a, b) => b.registration.updated_at.localeCompare(a.registration.updated_at)).slice(0, 3);
  const max = s.rules.maxPlayersPerTeam;

  return (
    <>
      <LiveRefresher tables={["registrations", "teams"]} pollSeconds={60} />
      <PageHeader title="Sorteio dos times" eyebrow="Atualiza sozinho — não precisa recarregar">
        Os elencos aparecem aqui conforme a organização registra cada jogador sorteado.
      </PageHeader>
      <div className="container-page space-y-8 py-8">
        {entries.length === 0 ? (
          <EmptyState icon={Shirt} title="Sorteio ainda não começou">
            Os elencos ainda não foram definidos.
          </EmptyState>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="card p-4">
                <p className="eyebrow">Inscritos</p>
                <p className="tabular font-display text-4xl font-extrabold">{entries.length}</p>
              </div>
              <div className="card p-4">
                <p className="eyebrow">Já sorteados</p>
                <p className="tabular font-display text-4xl font-extrabold text-accent">{assigned.length}</p>
              </div>
              <div className="card p-4">
                <p className="eyebrow">Aguardando</p>
                <p className="tabular font-display text-4xl font-extrabold">{waiting}</p>
              </div>
            </div>
            {latest.length ? (
              <section aria-live="polite" aria-labelledby="h-ultimos" className="card border-accent/40 p-4">
                <h2 id="h-ultimos" className="eyebrow mb-3 text-accent">
                  Últimos sorteados
                </h2>
                <ul className="flex flex-wrap gap-4">
                  {latest.map((e) => (
                    <li key={e.player.id} className="flex animate-fade-up items-center gap-2">
                      <PlayerAvatar player={e.player} size={36} ring={e.team?.primary_color} />
                      <span className="text-sm">
                        <strong>{displayName(e.player)}</strong> → {e.team?.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {s.teams.map((team) => {
                const roster = teamRoster(entries, team.id);
                return (
                  <section key={team.id} className="card overflow-hidden" aria-label={team.name}>
                    <header className="flex items-center gap-3 border-b border-line p-4" style={{ borderTop: `4px solid ${team.primary_color}` }}>
                      <Crest team={team} size={40} />
                      <Link href={`/times/${team.slug}`} className="flex-1 font-display text-xl font-extrabold uppercase hover:text-accent">
                        {team.name}
                      </Link>
                      <span className="tabular rounded-full bg-surface-3 px-2.5 py-1 text-xs font-bold">
                        {roster.length}
                        {max ? `/${max}` : ""}
                      </span>
                    </header>
                    {roster.length === 0 ? (
                      <p className="p-4 text-sm text-muted">Nenhum jogador ainda.</p>
                    ) : (
                      <ul className="divide-y divide-line/60">
                        {roster.map((e) => (
                          <li key={e.player.id} className="flex items-center gap-2.5 px-4 py-2">
                            <PlayerAvatar player={e.player} size={28} />
                            <span className="min-w-0 flex-1 truncate text-sm">
                              {displayName(e.player)}
                              {e.registration.is_captain ? <span className="ml-1 text-xs font-bold text-gold">(C)</span> : null}
                            </span>
                            {e.player.is_goalkeeper || e.player.position === "GOL" ? (
                              <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[0.65rem] font-bold text-muted">GOL</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}

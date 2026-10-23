import { ChevronRight, Shield } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PlayerAvatar } from "@/components/ui/avatar";
import { Crest } from "@/components/ui/crest";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/section";
import { displayName, rosterEntries, teamRoster } from "@/domain/snapshot";
import { computeStandings } from "@/domain/standings";
import { currentSnapshot } from "@/lib/data/require";

export const revalidate = 60;
export const metadata: Metadata = { title: "Times", description: "Os clubes do torneio, elencos e campanha." };

/**
 * Todos os times numa página só: rolando, vê-se cada elenco; tocando no
 * cabeçalho do time, abre a página detalhada (jogos, estatísticas, cartões).
 */
export default async function TeamsPage() {
  const s = await currentSnapshot();
  const entries = rosterEntries(s);
  const standings = computeStandings(s.teams, s.matches, s.events, s.rules);
  return (
    <>
      <PageHeader title="Times">Role para ver todos os elencos ou toque no time para ver jogos e estatísticas.</PageHeader>
      <div className="container-page space-y-8 py-6 sm:py-8">
        {s.teams.length === 0 ? (
          <EmptyState icon={Shield} title="Times em breve">
            Os times serão divulgados em breve.
          </EmptyState>
        ) : (
          <>
            <nav aria-label="Ir para o time" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
              <ul className="flex w-max gap-2">
                {s.teams.map((team) => (
                  <li key={team.id}>
                    <a href={`#${team.slug}`} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-surface pl-1.5 pr-4 text-sm font-semibold active:bg-surface-2">
                      <Crest team={team} size={26} />
                      {team.name}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            {s.teams.map((team) => {
              const row = standings.find((r) => r.team.id === team.id);
              const roster = teamRoster(entries, team.id);
              return (
                <section key={team.id} id={team.slug} aria-label={team.name} className="scroll-mt-20">
                  <Link
                    href={`/times/${team.slug}`}
                    className="card card-hover relative flex items-center gap-4 overflow-hidden p-4 sm:p-5"
                    style={{ backgroundImage: `linear-gradient(120deg, ${team.primary_color}30, transparent 60%)` }}
                  >
                    <Crest team={team} size={64} />
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-display text-2xl font-extrabold uppercase leading-none sm:text-3xl">{team.name}</h2>
                      <p className="mt-1 text-sm text-muted">
                        {roster.length ? `${roster.length} ${roster.length === 1 ? "jogador" : "jogadores"}` : "Elenco a definir"}
                        {row && row.played > 0 ? ` • ${row.position}º lugar • ${row.points} pts` : ""}
                      </p>
                    </div>
                    <span className="hidden text-sm text-accent sm:inline">Ver time</span>
                    <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
                  </Link>
                  {roster.length ? (
                    <ul className="mt-2 grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
                      {roster.map(({ player, registration }) => (
                        <li key={player.id} className="border-b border-line/70">
                          <Link href={`/jogadores/${player.slug}`} className="flex min-h-14 items-center gap-3 px-1 py-2 active:bg-surface-2">
                            <PlayerAvatar player={player} size={36} ring={team.primary_color} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-semibold">
                                {displayName(player)}
                                {registration.is_captain ? (
                                  <span className="ml-1.5 rounded bg-accent/15 px-1 text-[0.7rem] font-bold text-accent" title="Capitão">
                                    C
                                  </span>
                                ) : null}
                              </span>
                              {player.nickname ? <span className="block truncate text-xs text-muted">{player.name}</span> : null}
                            </span>
                            <span className="shrink-0 text-right text-xs text-muted">
                              {player.position ?? (player.is_goalkeeper ? "GOL" : "")}
                              {registration.shirt_number != null ? <span className="tabular ml-2 font-display text-lg font-bold text-ink/80">{registration.shirt_number}</span> : null}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}

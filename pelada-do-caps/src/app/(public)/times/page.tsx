import { Shield } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Crest } from "@/components/ui/crest";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/section";
import { rosterEntries, teamRoster } from "@/domain/snapshot";
import { computeStandings } from "@/domain/standings";
import { currentSnapshot } from "@/lib/data/require";

export const revalidate = 60;
export const metadata: Metadata = { title: "Times", description: "Os clubes do torneio, elencos e campanha." };

export default async function TeamsPage() {
  const s = await currentSnapshot();
  const entries = rosterEntries(s);
  const standings = computeStandings(s.teams, s.matches, s.events, s.rules);
  return (
    <>
      <PageHeader title="Times" eyebrow={s.edition.name} />
      <div className="container-page py-8">
        {s.teams.length === 0 ? (
          <EmptyState icon={Shield} title="Times em breve">
            Os times serão divulgados em breve.
          </EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {s.teams.map((team) => {
              const row = standings.find((r) => r.team.id === team.id);
              const roster = teamRoster(entries, team.id);
              const captain = roster.find((e) => e.registration.is_captain);
              return (
                <li key={team.id}>
                  <Link
                    href={`/times/${team.slug}`}
                    className="card card-hover relative flex items-center gap-4 overflow-hidden p-5"
                    style={{ backgroundImage: `linear-gradient(120deg, ${team.primary_color}30, transparent 60%)` }}
                  >
                    <Crest team={team} size={80} />
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-display text-3xl font-extrabold uppercase leading-none">{team.name}</h2>
                      <p className="mt-1 text-sm text-muted">
                        {roster.length ? `${roster.length} ${roster.length === 1 ? "jogador" : "jogadores"}` : "Elenco a definir"}
                        {captain ? ` • Capitão: ${captain.player.nickname || captain.player.name}` : ""}
                      </p>
                      {row && row.played > 0 ? (
                        <p className="mt-2 text-sm">
                          <span className="font-bold text-accent">{row.position}º</span> lugar • {row.points} pts • SG{" "}
                          {row.goalDifference > 0 ? "+" : ""}
                          {row.goalDifference}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

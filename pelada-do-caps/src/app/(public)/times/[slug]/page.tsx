import { Users } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MatchCard } from "@/components/public/match-card";
import { PlayerStatsTable } from "@/components/public/player-stats-table";
import { ShareButton } from "@/components/public/share-button";
import { Crest } from "@/components/ui/crest";
import { EmptyState } from "@/components/ui/empty-state";
import { computeDiscipline } from "@/domain/discipline";
import { orderedMatches } from "@/domain/schedule";
import { displayName, rosterEntries, teamRoster } from "@/domain/snapshot";
import { computeStandings } from "@/domain/standings";
import { computePlayerStats, teamTotals } from "@/domain/stats";
import { currentSnapshot } from "@/lib/data/require";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = await currentSnapshot();
  const team = s.teams.find((t) => t.slug === slug);
  if (!team) return { title: "Time não encontrado" };
  return {
    title: team.name,
    description: team.description ?? `Elenco, jogos e estatísticas do ${team.name} no ${s.edition.name}.`,
    openGraph: team.photo_url || team.crest_url ? { images: [team.photo_url ?? team.crest_url!] } : undefined,
  };
}

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await currentSnapshot();
  const team = s.teams.find((t) => t.slug === slug);
  if (!team) notFound();

  const roster = teamRoster(rosterEntries(s), team.id);
  const stats = computePlayerStats(s);
  const discipline = computeDiscipline(s);
  const standings = computeStandings(s.teams, s.matches, s.events, s.rules);
  const row = standings.find((r) => r.team.id === team.id)!;
  const totals = teamTotals(s, team.id);
  const matches = orderedMatches(s).filter((m) => m.home_team_id === team.id || m.away_team_id === team.id);
  const captain = roster.find((e) => e.registration.is_captain);
  const topScorer = [...roster].sort((a, b) => (stats.get(b.player.id)?.goals ?? 0) - (stats.get(a.player.id)?.goals ?? 0))[0];
  const topGoals = topScorer ? (stats.get(topScorer.player.id)?.goals ?? 0) : 0;

  const tiles: [string, string | number][] = [
    ["Posição", row.played ? `${row.position}º` : "—"],
    ["Pontos", row.points],
    ["Jogos", totals.played],
    ["V / E / D", `${row.wins} / ${row.draws} / ${row.losses}`],
    ["Gols marcados", totals.goalsFor],
    ["Gols sofridos", totals.goalsAgainst],
    ["Saldo", `${totals.goalsFor - totals.goalsAgainst > 0 ? "+" : ""}${totals.goalsFor - totals.goalsAgainst}`],
    ["Cartões", `${totals.yellow} 🟨 ${totals.red} 🟥`],
  ];

  return (
    <>
      <header className="relative overflow-hidden border-b border-line" style={{ backgroundImage: `linear-gradient(135deg, ${team.primary_color}55, transparent 65%)` }}>
        <div className="container-page relative flex flex-col items-center gap-5 py-10 text-center sm:flex-row sm:text-left">
          <Crest team={team} size={120} priority />
          <div className="flex-1">
            <p className="eyebrow mb-1 text-accent">{s.edition.name}</p>
            <h1 className="font-display text-5xl font-extrabold uppercase leading-none sm:text-7xl">{team.name}</h1>
            <p className="mt-2 text-muted">
              {captain ? `Capitão: ${displayName(captain.player)}` : "Capitão a definir"}
              {roster.length ? ` • ${roster.length} jogadores` : ""}
            </p>
            {team.description ? <p className="mt-3 max-w-2xl text-ink/80">{team.description}</p> : null}
          </div>
          <ShareButton title={team.name} path={`/times/${team.slug}`} />
        </div>
      </header>

      <div className="container-page space-y-10 py-8">
        {team.photo_url ? (
          <div className="card relative aspect-[16/9] overflow-hidden sm:aspect-[21/9]">
            <Image src={team.photo_url} alt={`Foto oficial do ${team.name}`} fill sizes="(min-width: 1152px) 1152px, 100vw" className="object-cover" />
          </div>
        ) : null}

        <section aria-label="Números do time">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tiles.map(([label, value]) => (
              <div key={label} className="card p-4">
                <dt className="eyebrow">{label}</dt>
                <dd className="tabular mt-1 font-display text-3xl font-extrabold">{value}</dd>
              </div>
            ))}
          </dl>
          {topScorer && topGoals > 0 ? (
            <p className="mt-3 text-sm text-muted">
              Artilheiro do time: <strong className="text-ink">{displayName(topScorer.player)}</strong> ({topGoals} {topGoals === 1 ? "gol" : "gols"})
            </p>
          ) : null}
        </section>

        <section>
          <h2 className="mb-4 font-display text-2xl font-extrabold uppercase">Elenco</h2>
          {roster.length ? (
            <PlayerStatsTable entries={roster} stats={stats} discipline={discipline} />
          ) : (
            <EmptyState icon={Users} title="Elenco a definir" compact>
              Os elencos ainda não foram definidos.
            </EmptyState>
          )}
        </section>

        <section>
          <h2 className="mb-4 font-display text-2xl font-extrabold uppercase">Jogos</h2>
          {matches.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {matches.map((m) => (
                <MatchCard key={m.id} s={s} match={m} />
              ))}
            </div>
          ) : (
            <p className="text-muted">Nenhum jogo cadastrado para este time.</p>
          )}
        </section>
      </div>
    </>
  );
}

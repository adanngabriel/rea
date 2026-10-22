import { Trophy } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AwardCard, tournamentPrizes } from "@/components/public/award-card";
import { PlayerAvatar } from "@/components/ui/avatar";
import { Crest } from "@/components/ui/crest";
import { EmptyState } from "@/components/ui/empty-state";
import { championOf } from "@/domain/bracket";
import { outcomeOf } from "@/domain/score";
import { displayName, indexSnapshot, rosterEntries, teamRoster } from "@/domain/snapshot";
import { orderedMatches } from "@/domain/schedule";
import { computePlayerStats, leaderboard, teamTotals } from "@/domain/stats";
import { currentSnapshot } from "@/lib/data/require";

export const revalidate = 60;
export const metadata: Metadata = { title: "Campeão e premiações", description: "As premiações do torneio e o grande campeão." };

export default async function ChampionPage() {
  const s = await currentSnapshot();
  const result = championOf(s);
  const ix = indexSnapshot(s);
  if (!result) {
    const prizes = tournamentPrizes(s.awards);
    return (
      <div className="container-page space-y-8 py-10">
        <EmptyState icon={Trophy} title="A taça ainda está em jogo">
          O campeão será conhecido na grande final. Acompanhe o <Link href="/mata-mata" className="text-accent underline">mata-mata</Link>.
        </EmptyState>
        {prizes.length ? (
          <section>
            <h2 className="mb-4 font-display text-2xl font-extrabold uppercase">Premiações em disputa</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {prizes.map((a) => (
                <li key={a.id}>
                  <AwardCard award={a} ix={ix} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    );
  }
  const team = ix.team(result.championId)!;
  const roster = teamRoster(rosterEntries(s), team.id);
  const totals = teamTotals(s, team.id);
  const matches = orderedMatches(s).filter((m) => m.status === "finished" && (m.home_team_id === team.id || m.away_team_id === team.id));
  const wins = matches.filter((m) => {
    const o = outcomeOf(m, s.events);
    return o.kind === "decided" && o.winnerId === team.id;
  }).length;
  const stats = computePlayerStats(s);
  const teamScorer = [...roster].sort((a, b) => (stats.get(b.player.id)?.goals ?? 0) - (stats.get(a.player.id)?.goals ?? 0))[0];
  const championAward = s.awards.find((a) => a.category === "champion");
  const awards = tournamentPrizes(s.awards, ["champion"]);
  const topScorer = leaderboard(s, "goals", stats)[0];

  return (
    <>
      <header
        className="relative overflow-hidden border-b border-gold/30"
        style={{ backgroundImage: `radial-gradient(80% 80% at 50% 0%, ${team.primary_color}66, transparent 70%), radial-gradient(60% 60% at 50% 100%, #f5c84b22, transparent)` }}
      >
        <div className="container-page flex flex-col items-center py-12 text-center sm:py-16">
          <Trophy className="size-14 text-gold drop-shadow-[0_0_24px_rgba(245,200,75,0.5)]" aria-hidden />
          <p className="eyebrow mt-4 text-gold">🏆 Campeão do {s.edition.name}</p>
          <Crest team={team} size={140} priority className="mt-6" />
          <h1 className="mt-4 font-display text-6xl font-extrabold uppercase leading-none sm:text-8xl">{team.name}</h1>
          {championAward?.description ? <p className="mt-3 max-w-xl text-muted">{championAward.description}</p> : null}
        </div>
      </header>
      <div className="container-page space-y-10 py-10">
        {championAward?.image_url || team.photo_url ? (
          <div className="card relative aspect-[16/9] overflow-hidden">
            <Image src={(championAward?.image_url ?? team.photo_url)!} alt={`Premiação do ${team.name}`} fill sizes="(min-width: 1152px) 1152px, 100vw" className="object-cover" />
          </div>
        ) : null}
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["Jogos", totals.played],
              ["Vitórias", wins],
              ["Gols marcados", totals.goalsFor],
              ["Artilheiro do time", teamScorer && (stats.get(teamScorer.player.id)?.goals ?? 0) > 0 ? displayName(teamScorer.player) : "—"],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="card p-4">
              <dt className="eyebrow">{label}</dt>
              <dd className="mt-1 truncate font-display text-3xl font-extrabold">{value}</dd>
            </div>
          ))}
        </dl>

        <section>
          <h2 className="mb-4 font-display text-2xl font-extrabold uppercase">Premiações</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {awards.map((a) => (
              <li key={a.id}>
                <AwardCard award={a} ix={ix} />
              </li>
            ))}
            {!awards.some((a) => a.category === "top_scorer") && topScorer ? (
              <li className="card flex items-center gap-3 p-4">
                <PlayerAvatar player={topScorer.entry.player} size={52} />
                <div>
                  <p className="eyebrow text-gold">Artilheiro</p>
                  <p className="font-semibold">{displayName(topScorer.entry.player)}</p>
                  <p className="text-xs text-muted">{topScorer.value} gols</p>
                </div>
              </li>
            ) : null}
            {!awards.some((a) => a.category === "runner_up") && result.runnerUpId ? (
              <li className="card flex items-center gap-3 p-4">
                <Crest team={ix.team(result.runnerUpId)} size={52} />
                <div>
                  <p className="eyebrow text-gold">Vice-campeão</p>
                  <p className="font-semibold">{ix.team(result.runnerUpId)?.name}</p>
                </div>
              </li>
            ) : null}
          </ul>
        </section>

        <section>
          <h2 className="mb-4 font-display text-2xl font-extrabold uppercase">Elenco campeão</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {roster.map((e) => (
              <li key={e.player.id}>
                <Link href={`/jogadores/${e.player.slug}`} className="card card-hover flex flex-col items-center gap-2 p-4 text-center">
                  <PlayerAvatar player={e.player} size={64} ring={team.primary_color} />
                  <span className="text-sm font-semibold">{displayName(e.player)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

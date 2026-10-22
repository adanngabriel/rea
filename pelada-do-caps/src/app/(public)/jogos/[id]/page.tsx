import { CalendarClock, FileDown, MapPin, Star, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveRefresher } from "@/components/public/live-refresher";
import { ShareButton } from "@/components/public/share-button";
import { PlayerAvatar } from "@/components/ui/avatar";
import { CardIcon, StatusBadge, SuspendedBadge } from "@/components/ui/badges";
import { Crest } from "@/components/ui/crest";
import { EmptyState } from "@/components/ui/empty-state";
import { computeDiscipline } from "@/domain/discipline";
import { hasScore, isLive, outcomeOf, scoreOf } from "@/domain/score";
import { displayName, indexSnapshot, matchStageLabel, rosterEntries, teamRoster, type Snapshot } from "@/domain/snapshot";
import type { Match, MatchEvent, Team } from "@/domain/types";
import { currentSnapshot } from "@/lib/data/require";
import { formatLongDate, formatTime } from "@/lib/format";

export const revalidate = 60;

async function load(id: string): Promise<{ s: Snapshot; match: Match } | null> {
  const s = await currentSnapshot();
  const match = s.matches.find((m) => m.id === id);
  return match ? { s, match } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const data = await load((await params).id);
  if (!data) return { title: "Partida não encontrada" };
  const ix = indexSnapshot(data.s);
  const home = ix.team(data.match.home_team_id)?.name ?? "A definir";
  const away = ix.team(data.match.away_team_id)?.name ?? "A definir";
  const score = scoreOf(data.match, data.s.events);
  const title = hasScore(data.match) ? `${home} ${score.home} × ${score.away} ${away}` : `${home} × ${away}`;
  const when = data.match.scheduled_at ? `${formatLongDate(data.match.scheduled_at)} às ${formatTime(data.match.scheduled_at)}` : "Data a definir";
  return {
    title,
    description: `${matchStageLabel(data.s, data.match)} • ${when} • ${data.match.venue || data.s.edition.venue || ""}`,
  };
}

const EVENT_LABEL: Record<MatchEvent["type"], string> = {
  goal: "Gol",
  own_goal: "Gol contra",
  yellow: "Cartão amarelo",
  red: "Cartão vermelho",
  mvp: "Craque do jogo",
};

function EventIcon({ type }: { type: MatchEvent["type"] }) {
  if (type === "yellow") return <CardIcon color="yellow" />;
  if (type === "red") return <CardIcon color="red" />;
  if (type === "mvp") return <Star className="size-4 fill-gold text-gold" aria-label="Craque do jogo" />;
  return (
    <span aria-label={EVENT_LABEL[type]} role="img" className="text-base leading-none">
      ⚽
    </span>
  );
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const data = await load((await params).id);
  if (!data) notFound();
  const { s, match } = data;
  const ix = indexSnapshot(s);
  const home = ix.team(match.home_team_id);
  const away = ix.team(match.away_team_id);
  const score = scoreOf(match, s.events);
  const outcome = outcomeOf(match, s.events);
  const events = s.events.filter((e) => e.match_id === match.id);
  const timeline = events.filter((e) => e.type !== "mvp");
  const mvp = events.find((e) => e.type === "mvp");
  const discipline = computeDiscipline(s);
  const entries = rosterEntries(s);
  const lineupFor = (team: Team) => {
    const lineup = s.lineups.filter((l) => l.match_id === match.id && l.team_id === team.id).map((l) => l.player_id);
    const roster = teamRoster(entries, team.id);
    return lineup.length
      ? { title: "Escalação", list: roster.filter((e) => lineup.includes(e.player.id)) }
      : { title: "Elenco", list: roster };
  };
  const venue = match.venue || s.edition.venue;

  return (
    <>
      <LiveRefresher tables={["matches", "match_events"]} pollSeconds={isLive(match) ? 30 : 0} />
      <header className="relative overflow-hidden border-b border-line">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `linear-gradient(110deg, ${home?.primary_color ?? "#1b2520"}55 0%, transparent 45%, transparent 55%, ${away?.primary_color ?? "#1b2520"}55 100%)`,
          }}
          aria-hidden
        />
        <div className="container-page relative py-8 sm:py-12">
          <div className="mb-6 flex items-center justify-between gap-2">
            <p className="eyebrow text-accent">{matchStageLabel(s, match)}</p>
            <StatusBadge status={match.status} />
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
            {[home, away].map((team, i) => (
              <div key={i} className={`flex flex-col items-center gap-3 text-center ${i === 1 ? "order-3" : ""}`}>
                <Crest team={team} size={96} priority />
                {team ? (
                  <Link href={`/times/${team.slug}`} className="font-display text-xl font-extrabold uppercase leading-tight hover:text-accent sm:text-3xl">
                    {team.name}
                  </Link>
                ) : (
                  <span className="font-display text-xl font-extrabold uppercase text-muted sm:text-3xl">A definir</span>
                )}
              </div>
            ))}
            <div className="order-2 text-center">
              {hasScore(match) ? (
                <h1 className="tabular font-display text-6xl font-extrabold leading-none sm:text-8xl" aria-live="polite">
                  <span className="sr-only">
                    {home?.name ?? "A definir"} {score.home} a {score.away} {away?.name ?? "A definir"}
                  </span>
                  <span aria-hidden>
                    {score.home}
                    <span className="mx-2 text-muted sm:mx-3">×</span>
                    {score.away}
                  </span>
                </h1>
              ) : (
                <h1 className="font-display text-5xl font-extrabold text-muted sm:text-7xl">
                  <span className="sr-only">
                    {home?.name ?? "A definir"} contra {away?.name ?? "A definir"}
                  </span>
                  <span aria-hidden>×</span>
                </h1>
              )}
              {outcome.kind === "decided" && outcome.byPenalties ? (
                <p className="mt-2 text-sm text-muted">
                  Pênaltis {match.home_penalties} × {match.away_penalties}
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-4" aria-hidden />
              {match.scheduled_at ? `${formatLongDate(match.scheduled_at)} • ${formatTime(match.scheduled_at)}` : "Data e horário a definir"}
            </span>
            {venue ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden />
                {venue}
              </span>
            ) : null}
            {match.attendance ? (
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-4" aria-hidden />
                Público: {match.attendance}
              </span>
            ) : null}
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <ShareButton title={`${home?.name ?? "A definir"} × ${away?.name ?? "A definir"}`} path={`/jogos/${match.id}`} />
            {hasScore(match) ? (
              <a href={`/api/sumula/${match.id}`} className="btn-secondary btn-sm">
                <FileDown className="size-4" aria-hidden /> Súmula (PDF)
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <div className="container-page grid grid-cols-1 gap-8 py-8 lg:grid-cols-[1.2fr_1fr]">
        <section aria-labelledby="h-lances">
          <h2 id="h-lances" className="mb-4 font-display text-2xl font-extrabold uppercase">
            Lances da partida
          </h2>
          {mvp?.player_id ? (
            <div className="card mb-4 flex items-center gap-3 border-gold/40 p-4">
              <Star className="size-5 fill-gold text-gold" aria-hidden />
              <PlayerAvatar player={ix.player(mvp.player_id)!} size={40} />
              <div>
                <p className="eyebrow">Craque do jogo</p>
                <Link href={`/jogadores/${ix.player(mvp.player_id)!.slug}`} className="font-semibold hover:text-accent">
                  {displayName(ix.player(mvp.player_id)!)}
                </Link>
              </div>
            </div>
          ) : null}
          {timeline.length === 0 ? (
            <EmptyState icon={CalendarClock} title={hasScore(match) ? "Sem lances registrados" : "Partida não iniciada"} compact>
              {hasScore(match) ? "Gols e cartões aparecem aqui assim que forem lançados na súmula." : "Acompanhe aqui gols, cartões e o craque do jogo em tempo real."}
            </EmptyState>
          ) : (
            <ol className="card divide-y divide-line">
              {timeline.map((e) => {
                const p = ix.player(e.player_id);
                const assist = ix.player(e.assist_player_id);
                const team = ix.team(e.team_id);
                const isHome = e.team_id === match.home_team_id;
                return (
                  <li key={e.id} className={`flex items-center gap-3 px-4 py-3 ${isHome ? "" : "sm:flex-row-reverse sm:text-right"}`}>
                    <span className="tabular w-10 shrink-0 text-center font-display text-lg font-bold text-muted">
                      {e.minute != null ? `${e.minute}'` : "—"}
                    </span>
                    <EventIcon type={e.type} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {p ? (
                          <Link href={`/jogadores/${p.slug}`} className="hover:text-accent">
                            {displayName(p)}
                          </Link>
                        ) : (
                          EVENT_LABEL[e.type]
                        )}
                        {e.type === "own_goal" && p ? <span className="text-muted"> (contra)</span> : null}
                      </p>
                      <p className="text-xs text-muted">
                        {team?.name}
                        {assist ? ` • Assistência: ${displayName(assist)}` : ""}
                        {e.notes ? ` • ${e.notes}` : ""}
                      </p>
                    </div>
                    <span className="h-8 w-1 rounded-full" style={{ background: team?.primary_color }} aria-hidden />
                  </li>
                );
              })}
            </ol>
          )}
          {match.notes ? (
            <div className="card mt-4 p-4">
              <p className="eyebrow mb-2">Observações</p>
              <p className="whitespace-pre-line text-sm text-ink/85">{match.notes}</p>
            </div>
          ) : null}
        </section>

        <section aria-labelledby="h-elencos">
          <h2 id="h-elencos" className="mb-4 font-display text-2xl font-extrabold uppercase">
            Elencos
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {[home, away].map((team, i) =>
              team ? (
                <div key={team.id} className="card overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-line px-4 py-3" style={{ borderTop: `3px solid ${team.primary_color}` }}>
                    <Crest team={team} size={24} />
                    <p className="font-semibold">{team.name}</p>
                    <p className="ml-auto text-xs uppercase tracking-wider text-muted">{lineupFor(team).title}</p>
                  </div>
                  {lineupFor(team).list.length === 0 ? (
                    <p className="px-4 py-5 text-sm text-muted">Os elencos ainda não foram definidos.</p>
                  ) : (
                    <ul className="divide-y divide-line/60">
                      {lineupFor(team).list.map((e) => {
                        const d = discipline.get(e.player.id);
                        const suspendedHere = d?.nextMissedMatchId === match.id;
                        return (
                          <li key={e.player.id} className="flex items-center gap-3 px-4 py-2.5">
                            <span className="tabular w-6 text-center font-display font-bold text-muted">{e.registration.shirt_number ?? "–"}</span>
                            <Link href={`/jogadores/${e.player.slug}`} className="min-w-0 flex-1 truncate text-sm hover:text-accent">
                              {displayName(e.player)}
                              {e.registration.is_captain ? <span className="ml-1.5 text-xs font-bold text-gold">(C)</span> : null}
                              {e.player.is_goalkeeper ? <span className="ml-1.5 text-xs text-muted">GOL</span> : null}
                            </Link>
                            {suspendedHere ? <SuspendedBadge /> : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : (
                <div key={i} className="card px-4 py-5 text-sm text-muted">
                  Adversário a definir.
                </div>
              ),
            )}
          </div>
        </section>
      </div>
    </>
  );
}

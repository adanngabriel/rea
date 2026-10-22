import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShareButton } from "@/components/public/share-button";
import { PlayerAvatar } from "@/components/ui/avatar";
import { CardIcon, POSITION_LABELS, SuspendedBadge } from "@/components/ui/badges";
import { Crest } from "@/components/ui/crest";
import { computeDiscipline } from "@/domain/discipline";
import { orderedMatches } from "@/domain/schedule";
import { scoreOf } from "@/domain/score";
import { displayName, indexSnapshot, matchStageLabel, rosterEntries } from "@/domain/snapshot";
import { computePlayerStats } from "@/domain/stats";
import { currentSnapshot } from "@/lib/data/require";
import { formatShortDate } from "@/lib/format";

export const revalidate = 60;

async function load(slug: string) {
  const s = await currentSnapshot();
  const entry = rosterEntries(s).find((e) => e.player.slug === slug);
  return entry ? { s, entry } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const data = await load((await params).slug);
  if (!data) return { title: "Jogador não encontrado" };
  const { player } = data.entry;
  return {
    title: displayName(player),
    description: `${player.name}${data.entry.team ? ` — ${data.entry.team.name}` : ""}. Estatísticas no ${data.s.edition.name}.`,
    openGraph: player.photo_url ? { images: [player.photo_url] } : undefined,
  };
}

export default async function PlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const data = await load((await params).slug);
  if (!data) notFound();
  const { s, entry } = data;
  const { player, registration, team } = entry;
  const st = computePlayerStats(s).get(player.id);
  const d = computeDiscipline(s).get(player.id);
  const ix = indexSnapshot(s);
  const myEvents = s.events.filter((e) => e.player_id === player.id || e.assist_player_id === player.id);
  const history = orderedMatches(s).filter((m) => myEvents.some((e) => e.match_id === m.id));
  const nextMissed = d?.nextMissedMatchId ? s.matches.find((m) => m.id === d.nextMissedMatchId) : null;

  const tiles: [string, number | string][] = [
    ["Jogos", st?.games ?? 0],
    ["Gols", st?.goals ?? 0],
    ["Assistências", st?.assists ?? 0],
    ["Craque do jogo", st?.mvp ?? 0],
  ];

  return (
    <>
      <header className="border-b border-line" style={{ backgroundImage: `linear-gradient(135deg, ${team?.primary_color ?? "#1b2520"}50, transparent 60%)` }}>
        <div className="container-page flex flex-col items-center gap-5 py-10 text-center sm:flex-row sm:text-left">
          <PlayerAvatar player={player} size={128} ring={team?.primary_color} />
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {registration.shirt_number != null ? (
                <span className="tabular font-display text-5xl font-extrabold text-accent">{registration.shirt_number}</span>
              ) : null}
              <h1 className="font-display text-5xl font-extrabold uppercase leading-none sm:text-6xl">{displayName(player)}</h1>
            </div>
            {player.nickname ? <p className="mt-1 text-muted">{player.name}</p> : null}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm sm:justify-start">
              {team ? (
                <Link href={`/times/${team.slug}`} className="inline-flex items-center gap-2 font-semibold hover:text-accent">
                  <Crest team={team} size={24} /> {team.name}
                </Link>
              ) : (
                <span className="text-muted">Aguardando sorteio</span>
              )}
              <span className="text-muted">
                {player.position ? POSITION_LABELS[player.position] : player.is_goalkeeper ? "Goleiro" : "Posição não informada"}
              </span>
              {registration.is_captain ? <span className="rounded bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold">CAPITÃO</span> : null}
              {d?.suspended ? <SuspendedBadge /> : null}
            </div>
          </div>
          <ShareButton title={displayName(player)} path={`/jogadores/${player.slug}`} />
        </div>
      </header>

      <div className="container-page space-y-8 py-8">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map(([label, value]) => (
            <div key={label} className="card p-4">
              <dt className="eyebrow">{label}</dt>
              <dd className="tabular mt-1 font-display text-4xl font-extrabold">{value}</dd>
            </div>
          ))}
        </dl>

        <section className="card p-5" aria-labelledby="h-disc">
          <h2 id="h-disc" className="eyebrow mb-3">
            Disciplina
          </h2>
          <div className="flex flex-wrap items-center gap-6">
            <CardIcon color="yellow" count={st?.yellow ?? 0} />
            <CardIcon color="red" count={st?.red ?? 0} />
            {d?.suspended ? (
              <p className="text-sm text-danger">
                Suspenso{nextMissed ? ` — cumpre no próximo jogo (${matchStageLabel(s, nextMissed)})` : ""}. Restam {d.remaining}{" "}
                {d.remaining === 1 ? "partida" : "partidas"}.
              </p>
            ) : (
              <p className="text-sm text-muted">Sem suspensões pendentes.</p>
            )}
          </div>
          {d && d.entries.length > 0 ? (
            <ul className="mt-4 space-y-1 text-sm text-muted">
              {d.entries.map((x) => (
                <li key={x.key}>
                  {x.reason} — {x.voided ? "anulada" : `${x.served}/${x.matches} cumprida(s)`}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section aria-labelledby="h-hist">
          <h2 id="h-hist" className="mb-4 font-display text-2xl font-extrabold uppercase">
            Histórico na competição
          </h2>
          {history.length === 0 ? (
            <p className="text-muted">Nenhum lance registrado ainda.</p>
          ) : (
            <ul className="card divide-y divide-line">
              {history.map((m) => {
                const sc = scoreOf(m, s.events);
                const evs = myEvents.filter((e) => e.match_id === m.id);
                const summary = [
                  ["goal", "⚽"],
                  ["own_goal", "⚽ (contra)"],
                  ["yellow", "🟨"],
                  ["red", "🟥"],
                  ["mvp", "⭐ Craque"],
                ]
                  .map(([type, icon]) => {
                    const n = evs.filter((e) => e.type === type && e.player_id === player.id).length;
                    return n ? `${icon}${n > 1 ? ` ×${n}` : ""}` : null;
                  })
                  .concat(evs.some((e) => e.assist_player_id === player.id) ? [`🅰️ ×${evs.filter((e) => e.assist_player_id === player.id).length}`] : [])
                  .filter(Boolean)
                  .join("  ");
                return (
                  <li key={m.id}>
                    <Link href={`/jogos/${m.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface-2">
                      <span className="w-14 text-xs text-muted">{m.scheduled_at ? formatShortDate(m.scheduled_at) : "—"}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {ix.team(m.home_team_id)?.name ?? "A definir"} {sc.home} × {sc.away} {ix.team(m.away_team_id)?.name ?? "A definir"}
                      </span>
                      <span className="text-sm">{summary}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

import { GitBranch, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LiveRefresher } from "@/components/public/live-refresher";
import { QualificationLegend, StandingsTable } from "@/components/public/standings-table";
import { StatusBadge } from "@/components/ui/badges";
import { Crest } from "@/components/ui/crest";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/section";
import { finalOutcome, qualificationMarks, resolveBracket, type BracketNode, type ResolvedSide } from "@/domain/bracket";
import { hasScore, outcomeOf, scoreOf } from "@/domain/score";
import { indexSnapshot, type Snapshot } from "@/domain/snapshot";
import { computeStandings, isGroupStageComplete } from "@/domain/standings";
import { currentSnapshot } from "@/lib/data/require";
import { formatShortDate, formatTime } from "@/lib/format";

export const revalidate = 60;
export const metadata: Metadata = { title: "Mata-mata", description: "Chaveamento da fase final." };

function Side({ s, side, teamId, score, winner, showScore }: { s: Snapshot; side: ResolvedSide; teamId: string | null; score: number; winner: boolean; showScore: boolean }) {
  const team = indexSnapshot(s).team(teamId);
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 ${winner ? "bg-accent/10" : ""}`}>
      <Crest team={team} size={26} />
      <span className={`min-w-0 flex-1 truncate text-sm ${team ? "font-semibold" : "text-muted"}`}>{team?.name ?? side.placeholder}</span>
      {showScore ? <span className={`tabular font-display text-xl font-extrabold ${winner ? "text-accent" : "text-ink/60"}`}>{score}</span> : null}
    </div>
  );
}

function NodeCard({ s, node }: { s: Snapshot; node: BracketNode }) {
  const m = node.match;
  // A partida cadastrada prevalece (inclusive ajustes manuais); sem ela, mostra o que as regras definem.
  const homeId = m ? m.home_team_id : node.home.teamId;
  const awayId = m ? m.away_team_id : node.away.teamId;
  const score = m ? scoreOf(m, s.events) : { home: 0, away: 0 };
  const outcome = m ? outcomeOf(m, s.events) : { kind: "pending" as const };
  const winnerId = outcome.kind === "decided" ? outcome.winnerId : null;
  const showScore = Boolean(m && hasScore(m));
  const body = (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <span className={`eyebrow ${node.isFinal ? "text-gold" : ""}`}>{node.slot.label}</span>
        {m ? <StatusBadge status={m.status} /> : null}
      </div>
      <Side s={s} side={node.home} teamId={homeId} score={score.home} winner={!!winnerId && winnerId === homeId} showScore={showScore} />
      <div className="border-t border-line/60" />
      <Side s={s} side={node.away} teamId={awayId} score={score.away} winner={!!winnerId && winnerId === awayId} showScore={showScore} />
      <p className="border-t border-line px-3 py-2 text-xs text-muted">
        {m?.scheduled_at ? `${formatShortDate(m.scheduled_at)} • ${formatTime(m.scheduled_at)}` : "Data a definir"}
        {outcome.kind === "decided" && outcome.byPenalties ? ` • Pên. ${m!.home_penalties}×${m!.away_penalties}` : ""}
      </p>
    </>
  );
  const cls = `card block w-full overflow-hidden ${node.isFinal ? "border-gold/50" : ""}`;
  return m ? (
    <Link href={`/jogos/${m.id}`} className={`${cls} card-hover`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export default async function BracketPage() {
  const s = await currentSnapshot();
  const nodes = resolveBracket(s);
  const marks = qualificationMarks(s.rules.knockout.slots);
  const columns = [...new Set(nodes.map((n) => n.depth))].sort((a, b) => a - b).map((d) => nodes.filter((n) => n.depth === d));
  const champion = finalOutcome(s);
  const ix = indexSnapshot(s);
  const complete = isGroupStageComplete(s.matches);

  return (
    <>
      <LiveRefresher tables={["matches", "match_events"]} />
      <PageHeader title="Mata-mata" eyebrow={s.edition.name}>
        {complete ? "Classificados definidos pela fase classificatória." : "Os confrontos são preenchidos automaticamente quando a fase classificatória terminar."}
      </PageHeader>
      <div className="container-page space-y-10 py-8">
        {nodes.length === 0 ? (
          <EmptyState icon={GitBranch} title="Formato a definir">
            A organização ainda vai definir o formato da fase final.
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8 md:overflow-x-auto md:pb-2">
            {columns.map((col, i) => (
              <div key={i} className="flex flex-1 flex-col justify-around gap-4 md:min-w-64">
                {col.map((n) => (
                  <NodeCard key={n.slot.key} s={s} node={n} />
                ))}
              </div>
            ))}
            {champion ? (
              <Link href="/campeao" className="card card-hover flex flex-col items-center gap-2 border-gold/60 p-6 text-center md:min-w-56">
                <Trophy className="size-10 text-gold" aria-hidden />
                <span className="eyebrow text-gold">Campeão</span>
                <Crest team={ix.team(champion.championId)} size={64} />
                <span className="font-display text-2xl font-extrabold uppercase">{ix.team(champion.championId)?.name}</span>
              </Link>
            ) : null}
          </div>
        )}
        {nodes.length > 0 && s.teams.length > 0 ? (
          <section>
            <h2 className="mb-3 font-display text-2xl font-extrabold uppercase">Quem avança</h2>
            <StandingsTable rows={computeStandings(s.teams, s.matches, s.events, s.rules)} marks={marks} compact />
            <QualificationLegend marks={marks} />
          </section>
        ) : null}
      </div>
    </>
  );
}

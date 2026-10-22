import { CalendarClock, MapPin } from "lucide-react";
import Link from "next/link";
import { hasScore, isLive, outcomeOf, scoreOf } from "@/domain/score";
import { indexSnapshot, matchStageLabel, type Snapshot } from "@/domain/snapshot";
import type { Match, Team } from "@/domain/types";
import { formatShortDate, formatTime, formatWeekday } from "@/lib/format";
import { StatusBadge } from "../ui/badges";
import { Crest } from "../ui/crest";

function TeamLine({ team, score, winner, showScore }: { team: Team | null; score: number; winner: boolean; showScore: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Crest team={team} size={28} />
      <span className={`min-w-0 flex-1 truncate font-semibold ${team ? "" : "text-muted"} ${showScore && !winner ? "text-ink/70" : ""}`}>
        {team?.name ?? "A definir"}
      </span>
      {showScore ? (
        <span className={`tabular font-display text-2xl font-extrabold ${winner ? "text-ink" : "text-ink/60"}`}>{score}</span>
      ) : null}
    </div>
  );
}

/** Card compacto de partida (listas de jogos, resultados, agenda). */
export function MatchCard({ s, match }: { s: Snapshot; match: Match }) {
  const ix = indexSnapshot(s);
  const home = ix.team(match.home_team_id);
  const away = ix.team(match.away_team_id);
  const showScore = hasScore(match);
  const score = scoreOf(match, s.events);
  const outcome = outcomeOf(match, s.events);
  const winnerId = outcome.kind === "decided" ? outcome.winnerId : null;
  return (
    <Link
      href={`/jogos/${match.id}`}
      className={`card card-hover block p-4 ${isLive(match) ? "border-live/40" : ""}`}
      aria-label={`${home?.name ?? "A definir"} contra ${away?.name ?? "A definir"}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="eyebrow truncate">{matchStageLabel(s, match)}</span>
        <StatusBadge status={match.status} />
      </div>
      <div className="space-y-2.5">
        <TeamLine team={home} score={score.home} showScore={showScore} winner={!winnerId || winnerId === home?.id} />
        <TeamLine team={away} score={score.away} showScore={showScore} winner={!winnerId || winnerId === away?.id} />
      </div>
      {outcome.kind === "decided" && outcome.byPenalties ? (
        <p className="mt-2 text-xs text-muted">
          Pênaltis: {match.home_penalties} × {match.away_penalties}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="size-3.5" aria-hidden />
          {match.scheduled_at
            ? `${formatWeekday(match.scheduled_at)} ${formatShortDate(match.scheduled_at)} • ${formatTime(match.scheduled_at)}`
            : "Data e horário a definir"}
        </span>
        {match.venue || s.edition.venue ? (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" aria-hidden />
            {match.venue || s.edition.venue}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

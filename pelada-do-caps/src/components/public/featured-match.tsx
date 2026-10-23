import { CalendarClock, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { hasScore, isLive, scoreOf } from "@/domain/score";
import { indexSnapshot, matchStageLabel, type Snapshot } from "@/domain/snapshot";
import type { Match, Team } from "@/domain/types";
import { formatLongDate, formatTime } from "@/lib/format";
import { StatusBadge } from "../ui/badges";
import { Crest } from "../ui/crest";

function Side({ team }: { team: Team | null }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
      <Crest team={team} size={84} priority className="drop-shadow-[0_8px_20px_rgba(0,0,0,0.5)]" />
      <span className="line-clamp-2 font-display text-lg font-bold uppercase leading-tight sm:text-2xl">
        {team?.name ?? "A definir"}
      </span>
    </div>
  );
}

/** Destaque da home: partida ao vivo, próximo jogo ou outro jogo da mesma rodada. */
export function FeaturedMatch({ s, match, next = true }: { s: Snapshot; match: Match; next?: boolean }) {
  const ix = indexSnapshot(s);
  const home = ix.team(match.home_team_id);
  const away = ix.team(match.away_team_id);
  const live = isLive(match);
  const score = scoreOf(match, s.events);
  const heading = live ? "Acontecendo agora" : match.status === "finished" ? "Resultado" : next ? "Próximo jogo" : "Na sequência";
  return (
    <article
      className={`card relative overflow-hidden p-5 sm:p-8 ${live ? "border-live/50" : ""}`}
      style={{
        backgroundImage: `radial-gradient(120% 90% at 0% 0%, ${home?.primary_color ?? "#1b2520"}33, transparent 55%), radial-gradient(120% 90% at 100% 100%, ${away?.primary_color ?? "#1b2520"}33, transparent 55%)`,
      }}
    >
      <div className="mb-5 flex items-center justify-between gap-2">
        <p className="eyebrow text-accent">{heading} • {matchStageLabel(s, match)}</p>
        {match.status !== "scheduled" ? <StatusBadge status={match.status} /> : null}
      </div>
      <div className="flex items-center gap-3 sm:gap-8">
        <Side team={home} />
        <div className="flex shrink-0 flex-col items-center">
          {hasScore(match) ? (
            <p className="tabular font-display text-5xl font-extrabold sm:text-7xl" aria-live="polite">
              {score.home}
              <span className="mx-2 text-muted">×</span>
              {score.away}
            </p>
          ) : (
            <p className="font-display text-4xl font-extrabold text-muted sm:text-6xl">×</p>
          )}
        </div>
        <Side team={away} />
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="size-4" aria-hidden />
          {match.scheduled_at ? formatLongDate(match.scheduled_at) : "Data a definir"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-4" aria-hidden />
          {match.scheduled_at ? formatTime(match.scheduled_at) : "Horário a definir"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-4" aria-hidden />
          {match.venue || s.edition.venue || "Local a definir"}
        </span>
      </div>
      <div className="mt-6 flex justify-center">
        <Link href={`/jogos/${match.id}`} className="btn-primary">
          {live ? "Acompanhar ao vivo" : "Ver partida"}
        </Link>
      </div>
    </article>
  );
}

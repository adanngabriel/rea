import Link from "next/link";
import type { RosterEntry } from "@/domain/snapshot";
import { displayName } from "@/domain/snapshot";
import type { Team } from "@/domain/types";
import { PlayerAvatar } from "../ui/avatar";
import { Crest } from "../ui/crest";

/** Card de destaque (artilheiro, garçom, MVP, líder). */
export function HighlightCard({
  label,
  entry,
  team,
  value,
  unit,
  empty,
}: {
  label: string;
  entry?: RosterEntry | null;
  team?: Team | null;
  value?: number;
  unit?: string;
  empty: string;
}) {
  const href = entry ? `/jogadores/${entry.player.slug}` : team ? `/times/${team.slug}` : undefined;
  const body = (
    <>
      <p className="eyebrow mb-3">{label}</p>
      {entry || team ? (
        <div className="flex items-center gap-3">
          {entry ? (
            <PlayerAvatar player={entry.player} size={48} ring={entry.team?.primary_color} />
          ) : (
            <Crest team={team!} size={48} />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{entry ? displayName(entry.player) : team!.name}</p>
            {entry?.team ? <p className="truncate text-xs text-muted">{entry.team.name}</p> : null}
          </div>
          {value !== undefined ? (
            <p className="text-right leading-none">
              <span className="tabular block font-display text-3xl font-extrabold text-accent">{value}</span>
              <span className="text-[0.65rem] uppercase tracking-wider text-muted">{unit}</span>
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted">{empty}</p>
      )}
    </>
  );
  return href ? (
    <Link href={href} className="card card-hover block p-4">
      {body}
    </Link>
  ) : (
    <div className="card p-4">{body}</div>
  );
}

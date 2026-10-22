import Link from "next/link";
import { displayName } from "@/domain/snapshot";
import type { LeaderboardRow } from "@/domain/stats";
import { PlayerAvatar } from "../ui/avatar";
import { Crest } from "../ui/crest";

/** Ranking com foto, jogador, time e valor. O 1º colocado ganha destaque. */
export function LeaderboardList({ rows, unit }: { rows: LeaderboardRow[]; unit: [string, string] }) {
  return (
    <ol className="card divide-y divide-line overflow-hidden">
      {rows.map((r) => (
        <li key={r.entry.player.id}>
          <Link
            href={`/jogadores/${r.entry.player.slug}`}
            className={`flex items-center gap-3 px-4 py-3 hover:bg-surface-2 ${r.rank === 1 ? "bg-accent/5" : ""}`}
          >
            <span className={`tabular w-7 text-center font-display text-xl font-extrabold ${r.rank === 1 ? "text-gold" : "text-muted"}`}>
              {r.rank}º
            </span>
            <PlayerAvatar player={r.entry.player} size={r.rank === 1 ? 52 : 40} ring={r.entry.team?.primary_color} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{displayName(r.entry.player)}</span>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                {r.entry.team ? <Crest team={r.entry.team} size={14} /> : null}
                {r.entry.team?.name ?? "Sem time"} • {r.stats.games} {r.stats.games === 1 ? "jogo" : "jogos"}
              </span>
            </span>
            <span className="text-right leading-none">
              <span className="tabular block font-display text-3xl font-extrabold text-accent">{r.value}</span>
              <span className="text-[0.65rem] uppercase tracking-wider text-muted">{r.value === 1 ? unit[0] : unit[1]}</span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

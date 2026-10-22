import Link from "next/link";
import { displayName, type RosterEntry } from "@/domain/snapshot";
import type { DisciplineStatus } from "@/domain/discipline";
import type { PlayerStats } from "@/domain/stats";
import { PlayerAvatar } from "../ui/avatar";
import { CardIcon, POSITION_LABELS, SuspendedBadge } from "../ui/badges";

/** Elenco com estatísticas; no celular vira lista de cartões. */
export function PlayerStatsTable({
  entries,
  stats,
  discipline,
}: {
  entries: RosterEntry[];
  stats: Map<string, PlayerStats>;
  discipline: Map<string, DisciplineStatus>;
}) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <caption className="sr-only">Elenco e estatísticas</caption>
        <thead className="hidden sm:table-header-group">
          <tr className="border-b border-line text-[0.7rem] uppercase tracking-wider text-muted">
            <th scope="col" className="px-4 py-3 text-left">Jogador</th>
            <th scope="col" className="px-2 py-3 text-center"><abbr title="Jogos" className="no-underline">J</abbr></th>
            <th scope="col" className="px-2 py-3 text-center"><abbr title="Gols" className="no-underline">G</abbr></th>
            <th scope="col" className="px-2 py-3 text-center"><abbr title="Assistências" className="no-underline">A</abbr></th>
            <th scope="col" className="px-2 py-3 text-center"><abbr title="Craque do jogo" className="no-underline">MVP</abbr></th>
            <th scope="col" className="px-4 py-3 text-center">Cartões</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const st = stats.get(e.player.id);
            const d = discipline.get(e.player.id);
            return (
              <tr key={e.player.id} className="flex flex-wrap items-center border-b border-line/60 px-4 py-3 last:border-0 sm:table-row sm:p-0">
                <th scope="row" className="w-full text-left font-normal sm:w-auto sm:px-4 sm:py-2.5">
                  <Link href={`/jogadores/${e.player.slug}`} className="flex items-center gap-3 hover:text-accent">
                    <PlayerAvatar player={e.player} size={36} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">
                        {e.registration.shirt_number != null ? <span className="tabular mr-1.5 text-muted">{e.registration.shirt_number}</span> : null}
                        {displayName(e.player)}
                        {e.registration.is_captain ? <span className="ml-1.5 text-xs font-bold text-gold">(C)</span> : null}
                      </span>
                      <span className="block text-xs text-muted">
                        {e.player.position ? POSITION_LABELS[e.player.position] : e.player.is_goalkeeper ? "Goleiro" : "Posição não informada"}
                      </span>
                    </span>
                    {d?.suspended ? <SuspendedBadge /> : null}
                  </Link>
                </th>
                {(["games", "goals", "assists", "mvp"] as const).map((k) => (
                  <td key={k} className="tabular mt-2 w-1/5 text-center text-ink/85 sm:mt-0 sm:w-auto sm:px-2">
                    <span className="block text-[0.6rem] uppercase text-muted sm:hidden">{{ games: "J", goals: "G", assists: "A", mvp: "MVP" }[k]}</span>
                    {st?.[k] ?? 0}
                  </td>
                ))}
                <td className="mt-2 w-1/5 text-center sm:mt-0 sm:w-auto sm:px-4">
                  <span className="block text-[0.6rem] uppercase text-muted sm:hidden">Cartões</span>
                  <span className="inline-flex gap-2">
                    <CardIcon color="yellow" count={st?.yellow ?? 0} />
                    <CardIcon color="red" count={st?.red ?? 0} />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

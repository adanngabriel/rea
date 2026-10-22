import Link from "next/link";
import { computeDiscipline } from "@/domain/discipline";
import { displayName, rosterEntries, type Snapshot } from "@/domain/snapshot";
import { PlayerAvatar } from "../ui/avatar";
import { CardIcon, SuspendedBadge } from "../ui/badges";

/** Jogadores com cartões ou suspensões, os suspensos primeiro. */
export function DisciplineTable({ s }: { s: Snapshot }) {
  const discipline = computeDiscipline(s);
  const rows = rosterEntries(s)
    .map((entry) => ({ entry, d: discipline.get(entry.player.id)! }))
    .filter(({ d }) => d && (d.yellow > 0 || d.red > 0 || d.entries.length > 0))
    .sort((a, b) => Number(b.d.suspended) - Number(a.d.suspended) || b.d.red * 3 + b.d.yellow - (a.d.red * 3 + a.d.yellow));
  if (rows.length === 0) return null;
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <caption className="sr-only">Cartões e suspensões</caption>
        <thead>
          <tr className="border-b border-line text-[0.7rem] uppercase tracking-wider text-muted">
            <th scope="col" className="px-4 py-3 text-left">Jogador</th>
            <th scope="col" className="px-2 py-3 text-center"><CardIcon color="yellow" /></th>
            <th scope="col" className="px-2 py-3 text-center"><CardIcon color="red" /></th>
            <th scope="col" className="px-4 py-3 text-right">Situação</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ entry, d }) => (
            <tr key={entry.player.id} className="border-b border-line/60 last:border-0">
              <th scope="row" className="px-4 py-2.5 text-left font-normal">
                <Link href={`/jogadores/${entry.player.slug}`} className="flex items-center gap-3 hover:text-accent">
                  <PlayerAvatar player={entry.player} size={34} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{displayName(entry.player)}</span>
                    <span className="block truncate text-xs text-muted">{entry.team?.name ?? "Sem time"}</span>
                  </span>
                </Link>
              </th>
              <td className="tabular px-2 text-center font-semibold">{d.yellow}</td>
              <td className="tabular px-2 text-center font-semibold">{d.red}</td>
              <td className="px-4 text-right">
                {d.suspended ? (
                  <span className="inline-flex flex-col items-end gap-0.5">
                    <SuspendedBadge />
                    <span className="text-[0.7rem] text-muted">
                      {d.remaining} {d.remaining === 1 ? "jogo" : "jogos"}
                    </span>
                  </span>
                ) : (
                  <span className="text-xs text-muted">Liberado</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import Link from "next/link";
import type { QualificationMark } from "@/domain/bracket";
import type { FormResult, StandingRow } from "@/domain/standings";
import { Crest } from "../ui/crest";

const formTone: Record<FormResult, string> = {
  V: "bg-success text-bg",
  E: "bg-surface-3 text-muted",
  D: "bg-danger/80 text-white",
};

/**
 * Tabela de classificação. No celular, a coluna do time fica fixa e as
 * colunas secundárias rolam lateralmente; no modo compacto (home) só as
 * colunas essenciais aparecem.
 */
export function StandingsTable({
  rows,
  marks,
  compact = false,
}: {
  rows: StandingRow[];
  marks: Map<number, QualificationMark>;
  compact?: boolean;
}) {
  const cols = compact
    ? (["points", "played", "goalDifference"] as const)
    : (["points", "played", "wins", "draws", "losses", "goalsFor", "goalsAgainst", "goalDifference"] as const);
  const labels: Record<(typeof cols)[number], [string, string]> = {
    points: ["P", "Pontos"],
    played: ["J", "Jogos"],
    wins: ["V", "Vitórias"],
    draws: ["E", "Empates"],
    losses: ["D", "Derrotas"],
    goalsFor: ["GP", "Gols pró"],
    goalsAgainst: ["GC", "Gols contra"],
    goalDifference: ["SG", "Saldo de gols"],
  };
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-full border-collapse text-sm">
          <caption className="sr-only">Classificação</caption>
          <thead>
            <tr className="border-b border-line text-[0.7rem] uppercase tracking-wider text-muted">
              <th scope="col" className="sticky left-0 z-10 bg-surface py-3 pl-3 pr-2 text-left font-semibold sm:pl-5">
                <abbr title="Posição" className="no-underline">#</abbr> Time
              </th>
              {cols.map((c) => (
                <th key={c} scope="col" className={`px-2 py-3 text-center font-semibold ${c === "points" ? "text-ink" : ""}`}>
                  <abbr title={labels[c][1]} className="no-underline">
                    {labels[c][0]}
                  </abbr>
                </th>
              ))}
              {!compact ? (
                <th scope="col" className="hidden px-3 py-3 text-center font-semibold md:table-cell">
                  Últimos
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const mark = marks.get(row.position);
              const bar = mark ? (mark.tone === "direct" ? "bg-qualify-direct" : "bg-qualify") : "bg-transparent";
              return (
                <tr key={row.team.id} className="border-b border-line/70 last:border-0">
                  <th scope="row" className="sticky left-0 z-10 bg-surface p-0 text-left font-normal">
                    <div className="relative flex items-center gap-2.5 py-3 pl-3 pr-2 sm:pl-5">
                      <span className={`absolute inset-y-1.5 left-0 w-1 rounded-r ${bar}`} aria-hidden />
                      <span className="tabular w-5 text-center font-display text-lg font-bold text-muted">{row.position}</span>
                      <Crest team={row.team} size={26} />
                      <Link
                        href={`/times/${row.team.slug}`}
                        className="max-w-[8.5rem] truncate font-semibold hover:text-accent sm:max-w-none"
                      >
                        {row.team.name}
                      </Link>
                      {row.unresolvedTie ? (
                        <span className="text-warning" title="Empate não resolvido pelos critérios configurados">
                          *
                        </span>
                      ) : null}
                    </div>
                  </th>
                  {cols.map((c) => (
                    <td
                      key={c}
                      className={`tabular px-2 py-3 text-center ${c === "points" ? "font-display text-lg font-extrabold text-ink" : "text-ink/80"}`}
                    >
                      {c === "goalDifference" && row[c] > 0 ? `+${row[c]}` : row[c]}
                    </td>
                  ))}
                  {!compact ? (
                    <td className="hidden px-3 py-3 md:table-cell">
                      <div className="flex justify-center gap-1">
                        {row.form.length === 0 ? <span className="text-subtle">—</span> : null}
                        {row.form.map((f, i) => (
                          <span key={i} className={`grid size-5 place-items-center rounded text-[0.65rem] font-bold ${formTone[f]}`}>
                            {f}
                          </span>
                        ))}
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function QualificationLegend({ marks }: { marks: Map<number, QualificationMark> }) {
  const groups = new Map<string, { tone: QualificationMark["tone"]; positions: number[] }>();
  for (const [pos, mark] of [...marks].sort((a, b) => a[0] - b[0])) {
    const g = groups.get(mark.label) ?? { tone: mark.tone, positions: [] };
    g.positions.push(pos);
    groups.set(mark.label, g);
  }
  if (groups.size === 0) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
      {[...groups].map(([label, g]) => (
        <li key={label} className="inline-flex items-center gap-2">
          <span className={`h-3 w-1 rounded ${g.tone === "direct" ? "bg-qualify-direct" : "bg-qualify"}`} aria-hidden />
          {g.positions.map((p) => `${p}º`).join(", ")} → {label}
        </li>
      ))}
    </ul>
  );
}

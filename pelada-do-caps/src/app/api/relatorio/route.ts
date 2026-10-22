import { orderedMatches, STATUS_LABELS } from "@/domain/schedule";
import { hasScore, scoreOf } from "@/domain/score";
import { displayName, indexSnapshot, matchStageLabel } from "@/domain/snapshot";
import { computeStandings } from "@/domain/standings";
import { leaderboard } from "@/domain/stats";
import { getPublicSnapshot } from "@/lib/data/tournament";
import { formatDateTime } from "@/lib/format";
import { PdfReport, pdfResponse } from "@/lib/pdf";

/** Relatório geral em PDF: classificação, jogos, resultados e artilharia. */
export async function GET() {
  const s = await getPublicSnapshot();
  if (!s) return new Response("Nenhuma edição ativa", { status: 404 });
  const ix = indexSnapshot(s);
  const pdf = await PdfReport.create(s.edition.name);
  pdf.heading(s.edition.name, 22);
  pdf.muted(`${s.edition.venue ?? ""} • Relatório gerado em ${formatDateTime(new Date().toISOString())}`);
  pdf.gap(12);

  pdf.heading("Classificação", 14);
  pdf.table(
    [
      { label: "#", width: 26, align: "center" },
      { label: "Time", width: 200 },
      { label: "P", width: 36, align: "center" },
      { label: "J", width: 36, align: "center" },
      { label: "V", width: 36, align: "center" },
      { label: "E", width: 36, align: "center" },
      { label: "D", width: 36, align: "center" },
      { label: "GP", width: 36, align: "center" },
      { label: "GC", width: 36, align: "center" },
      { label: "SG", width: 33, align: "center" },
    ],
    computeStandings(s.teams, s.matches, s.events, s.rules).map((r) => [r.position, r.team.name, r.points, r.played, r.wins, r.draws, r.losses, r.goalsFor, r.goalsAgainst, r.goalDifference]),
  );

  pdf.heading("Jogos e resultados", 14);
  pdf.table(
    [
      { label: "Fase", width: 90 },
      { label: "Data", width: 85 },
      { label: "Time A", width: 105, align: "right" },
      { label: "Placar", width: 46, align: "center" },
      { label: "Time B", width: 105 },
      { label: "Status", width: 80 },
    ],
    orderedMatches(s).map((m) => {
      const sc = scoreOf(m, s.events);
      return [
        matchStageLabel(s, m),
        m.scheduled_at ? formatDateTime(m.scheduled_at).replace(" às ", " ") : "A definir",
        ix.team(m.home_team_id)?.name ?? "A definir",
        hasScore(m) ? `${sc.home} × ${sc.away}` : "×",
        ix.team(m.away_team_id)?.name ?? "A definir",
        STATUS_LABELS[m.status],
      ];
    }),
  );

  pdf.heading("Artilharia", 14);
  const scorers = leaderboard(s, "goals");
  if (scorers.length === 0) pdf.muted("Nenhum gol registrado ainda.");
  else
    pdf.table(
      [
        { label: "#", width: 30, align: "center" },
        { label: "Jogador", width: 220 },
        { label: "Time", width: 170 },
        { label: "Gols", width: 50, align: "center" },
        { label: "Jogos", width: 41, align: "center" },
      ],
      scorers.map((r) => [`${r.rank}º`, displayName(r.entry.player), r.entry.team?.name ?? "", r.value, r.stats.games]),
    );
  return pdfResponse(await pdf.bytes(), "relatorio-pelada-do-caps.pdf");
}

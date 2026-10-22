import { STATUS_LABELS } from "@/domain/schedule";
import { scoreOf } from "@/domain/score";
import { displayName, indexSnapshot, matchStageLabel, rosterEntries, teamRoster } from "@/domain/snapshot";
import { getPublicSnapshot } from "@/lib/data/tournament";
import { formatDateTime } from "@/lib/format";
import { PdfReport, pdfResponse } from "@/lib/pdf";

const EVENT = { goal: "Gol", own_goal: "Gol contra", yellow: "Cartão amarelo", red: "Cartão vermelho", mvp: "Craque do jogo" } as const;

/** Súmula da partida em PDF. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getPublicSnapshot();
  const match = s?.matches.find((m) => m.id === id);
  if (!s || !match) return new Response("Partida não encontrada", { status: 404 });
  const ix = indexSnapshot(s);
  const home = ix.team(match.home_team_id);
  const away = ix.team(match.away_team_id);
  const sc = scoreOf(match, s.events);
  const pdf = await PdfReport.create(`${s.edition.name} — Súmula`);
  pdf.heading("Súmula da partida", 20);
  pdf.muted(`${matchStageLabel(s, match)} • ${match.scheduled_at ? formatDateTime(match.scheduled_at) : "Data a definir"} • ${match.venue ?? s.edition.venue ?? ""}`);
  pdf.gap(8);
  pdf.heading(`${home?.name ?? "A definir"} ${sc.home} × ${sc.away} ${away?.name ?? "A definir"}`, 16);
  if (match.home_penalties != null) pdf.text(`Pênaltis: ${match.home_penalties} × ${match.away_penalties}`);
  pdf.muted(`Situação: ${STATUS_LABELS[match.status]}${match.attendance ? ` • Público: ${match.attendance}` : ""}`);
  pdf.gap(8);

  const events = s.events.filter((e) => e.match_id === match.id);
  pdf.heading("Lances", 13);
  if (events.length === 0) pdf.muted("Nenhum lance registrado.");
  else
    pdf.table(
      [
        { label: "Min.", width: 40, align: "center" },
        { label: "Lance", width: 110 },
        { label: "Jogador", width: 160 },
        { label: "Time", width: 110 },
        { label: "Assistência", width: 91 },
      ],
      events.map((e) => [
        e.minute != null ? `${e.minute}'` : "—",
        EVENT[e.type],
        ix.player(e.player_id) ? displayName(ix.player(e.player_id)!) : "Não identificado",
        ix.team(e.team_id)?.name ?? "",
        ix.player(e.assist_player_id) ? displayName(ix.player(e.assist_player_id)!) : "",
      ]),
    );

  const entries = rosterEntries(s);
  for (const team of [home, away]) {
    if (!team) continue;
    const lineup = s.lineups.filter((l) => l.match_id === match.id && l.team_id === team.id).map((l) => l.player_id);
    const roster = teamRoster(entries, team.id).filter((e) => !lineup.length || lineup.includes(e.player.id));
    pdf.heading(`${lineup.length ? "Escalação" : "Elenco"} — ${team.name}`, 12);
    pdf.text(roster.map((e) => `${e.registration.shirt_number ?? "–"} ${displayName(e.player)}${e.registration.is_captain ? " (C)" : ""}`).join(" • ") || "—", { size: 9.5 });
    pdf.gap(6);
  }
  if (match.notes) {
    pdf.heading("Observações", 12);
    pdf.text(match.notes, { size: 9.5 });
  }
  return pdfResponse(await pdf.bytes(), `sumula-${id.slice(0, 8)}.pdf`);
}

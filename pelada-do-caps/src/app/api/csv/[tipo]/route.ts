import { computeDiscipline } from "@/domain/discipline";
import { orderedMatches, STATUS_LABELS } from "@/domain/schedule";
import { hasScore, scoreOf } from "@/domain/score";
import { indexSnapshot, matchStageLabel, rosterEntries } from "@/domain/snapshot";
import { computeStandings } from "@/domain/standings";
import { computePlayerStats } from "@/domain/stats";
import { toCsv } from "@/lib/csv";
import { getPublicSnapshot } from "@/lib/data/tournament";
import { formatDate, formatTime } from "@/lib/format";

/** Planilhas com os dados públicos atuais: /api/csv/classificacao */
export async function GET(_request: Request, { params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  const s = await getPublicSnapshot();
  if (!s) return new Response("Nenhuma edição ativa", { status: 404 });
  const ix = indexSnapshot(s);
  let csv: string;
  switch (tipo) {
    case "classificacao":
      csv = toCsv(
        ["Posição", "Time", "Pontos", "Jogos", "Vitórias", "Empates", "Derrotas", "Gols pró", "Gols contra", "Saldo"],
        computeStandings(s.teams, s.matches, s.events, s.rules).map((r) => [r.position, r.team.name, r.points, r.played, r.wins, r.draws, r.losses, r.goalsFor, r.goalsAgainst, r.goalDifference]),
      );
      break;
    case "jogos":
      csv = toCsv(
        ["Rodada", "Data", "Horário", "Time A", "Gols A", "Gols B", "Time B", "Pênaltis", "Local", "Status"],
        orderedMatches(s).map((m) => {
          const sc = scoreOf(m, s.events);
          return [
            matchStageLabel(s, m),
            m.scheduled_at ? formatDate(m.scheduled_at) : "",
            m.scheduled_at ? formatTime(m.scheduled_at) : "",
            ix.team(m.home_team_id)?.name ?? "A definir",
            hasScore(m) ? sc.home : "",
            hasScore(m) ? sc.away : "",
            ix.team(m.away_team_id)?.name ?? "A definir",
            m.home_penalties != null ? `${m.home_penalties}x${m.away_penalties}` : "",
            m.venue ?? s.edition.venue ?? "",
            STATUS_LABELS[m.status],
          ];
        }),
      );
      break;
    case "jogadores": {
      const stats = computePlayerStats(s);
      const disc = computeDiscipline(s);
      csv = toCsv(
        ["Nome", "Apelido", "Time", "Camisa", "Posição", "Jogos", "Gols", "Assistências", "Craque do jogo", "Amarelos", "Vermelhos", "Suspenso"],
        rosterEntries(s).map((e) => {
          const st = stats.get(e.player.id);
          return [
            e.player.name,
            e.player.nickname,
            e.team?.name ?? "Sem time",
            e.registration.shirt_number,
            e.player.position,
            st?.games ?? 0,
            st?.goals ?? 0,
            st?.assists ?? 0,
            st?.mvp ?? 0,
            st?.yellow ?? 0,
            st?.red ?? 0,
            disc.get(e.player.id)?.suspended ? "Sim" : "Não",
          ];
        }),
      );
      break;
    }
    default:
      return new Response("Tipo desconhecido", { status: 404 });
  }
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pelada-do-caps-${tipo}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

import { formatShortDate, formatTime } from "@/lib/format";
import { finishedMatches, upcomingMatches } from "./schedule";
import { scoreOf } from "./score";
import { byId, displayName, type Snapshot } from "./snapshot";
import { computeStandings } from "./standings";
import { leaderboard } from "./stats";
import type { Match } from "./types";

export type ShareSection = "standings" | "upcoming" | "results" | "scorers";

const teamName = (s: Snapshot, id: string | null) => (id ? (byId(s.teams).get(id)?.name ?? "A definir") : "A definir");

function matchLine(s: Snapshot, m: Match, withScore: boolean): string {
  const home = teamName(s, m.home_team_id);
  const away = teamName(s, m.away_team_id);
  if (withScore) {
    const sc = scoreOf(m, s.events);
    const pens = m.home_penalties != null ? ` (pên. ${m.home_penalties}×${m.away_penalties})` : "";
    return `${home} ${sc.home} × ${sc.away} ${away}${pens}`;
  }
  const when = m.scheduled_at ? `${formatShortDate(m.scheduled_at)} ${formatTime(m.scheduled_at)} — ` : "";
  return `${when}${home} × ${away}`;
}

/** Texto pronto para colar no WhatsApp, gerado dos dados atuais. */
export function buildShareText(s: Snapshot, sections: readonly ShareSection[], siteUrl?: string): string {
  const lines: string[] = [`🏆 *${s.edition.name.toUpperCase()}*`];
  if (s.edition.venue) lines.push(`📍 ${s.edition.venue}`);

  if (sections.includes("standings")) {
    lines.push("", "*CLASSIFICAÇÃO*");
    for (const row of computeStandings(s.teams, s.matches, s.events, s.rules)) {
      const pts = row.points === 1 ? "pt" : "pts";
      lines.push(`${row.position}º ${row.team.name} — ${row.points} ${pts} (${row.played}J, SG ${row.goalDifference > 0 ? "+" : ""}${row.goalDifference})`);
    }
  }
  if (sections.includes("results")) {
    const results = finishedMatches(s).slice(0, 6);
    lines.push("", "✅ *ÚLTIMOS RESULTADOS*");
    if (results.length === 0) lines.push("A competição ainda não começou.");
    for (const m of results) lines.push(matchLine(s, m, true));
  }
  if (sections.includes("upcoming")) {
    const upcoming = upcomingMatches(s).slice(0, 6);
    lines.push("", "⚽ *PRÓXIMOS JOGOS*");
    if (upcoming.length === 0) lines.push("Nenhum jogo agendado.");
    for (const m of upcoming) lines.push(matchLine(s, m, false));
  }
  if (sections.includes("scorers")) {
    const top = leaderboard(s, "goals").slice(0, 5);
    lines.push("", "🥅 *ARTILHARIA*");
    if (top.length === 0) lines.push("Nenhum gol registrado ainda.");
    for (const r of top) {
      lines.push(`${r.rank}º ${displayName(r.entry.player)}${r.entry.team ? ` (${r.entry.team.name})` : ""} — ${r.value} ${r.value === 1 ? "gol" : "gols"}`);
    }
  }
  if (siteUrl) lines.push("", `🔗 ${siteUrl}`);
  return lines.join("\n");
}

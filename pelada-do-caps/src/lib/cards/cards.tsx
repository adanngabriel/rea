import "server-only";
import { qualificationMarks } from "@/domain/bracket";
import { orderedMatches } from "@/domain/schedule";
import { hasScore, scoreOf } from "@/domain/score";
import { displayName, indexSnapshot, matchStageLabel, type Snapshot } from "@/domain/snapshot";
import { computeStandings } from "@/domain/standings";
import { leaderboard } from "@/domain/stats";
import type { Match } from "@/domain/types";
import { formatShortDate, formatTime, formatWeekday } from "../format";
import { siteUrl } from "../supabase/env";
import { C, CrestBox, crestMap, embedImage, Frame, renderCard, type CardFormat } from "./render";

const footer = () => siteUrl().replace(/^https?:\/\//, "");

export async function standingsCard(s: Snapshot, format: CardFormat) {
  const rows = computeStandings(s.teams, s.matches, s.events, s.rules);
  const marks = qualificationMarks(s.rules.knockout.slots);
  const crests = await crestMap(s.teams);
  const big = format === "story";
  const rowH = big ? 150 : 118;
  return renderCard(
    <Frame format={format} eyebrow={s.edition.name} title="Classificação" footer={footer()}>
      <div style={{ display: "flex", fontSize: 30, color: C.muted, paddingBottom: 12, borderBottom: `2px solid ${C.line}` }}>
        <span style={{ width: 70 }}>#</span>
        <span style={{ flex: 1 }}>Time</span>
        {["P", "J", "V", "SG"].map((h) => (
          <span key={h} style={{ width: 96, display: "flex", justifyContent: "center" }}>{h}</span>
        ))}
      </div>
      {rows.map((r) => {
        const mark = marks.get(r.position);
        return (
          <div key={r.team.id} style={{ display: "flex", alignItems: "center", height: rowH, borderBottom: `2px solid ${C.line}`, borderLeft: `8px solid ${mark ? (mark.tone === "direct" ? C.gold : C.accent) : "transparent"}`, paddingLeft: 16 }}>
            <span style={{ width: 54, fontSize: 52, fontWeight: 800, color: C.muted }}>{r.position}</span>
            <CrestBox team={r.team} src={crests.get(r.team.id)} size={big ? 96 : 76} />
            <span style={{ flex: 1, marginLeft: 24, fontSize: big ? 60 : 52, fontWeight: 800, textTransform: "uppercase" }}>{r.team.name}</span>
            {[r.points, r.played, r.wins, r.goalDifference].map((v, i) => (
              <span key={i} style={{ width: 96, display: "flex", justifyContent: "center", fontSize: i === 0 ? 60 : 44, fontWeight: i === 0 ? 800 : 600, color: i === 0 ? C.accent : C.ink }}>
                {i === 3 && v > 0 ? `+${v}` : v}
              </span>
            ))}
          </div>
        );
      })}
      {marks.size ? (
        <div style={{ display: "flex", marginTop: 24, fontSize: 28, color: C.muted }}>
          {[...new Set([...marks.values()].map((m) => m.label))].map((label) => `→ ${label}`).join("   ")}
        </div>
      ) : null}
    </Frame>,
    format,
  );
}

function MatchRow({ s, m, crests, big }: { s: Snapshot; m: Match; crests: Map<string, string | null>; big: boolean }) {
  const ix = indexSnapshot(s);
  const home = ix.team(m.home_team_id);
  const away = ix.team(m.away_team_id);
  const sc = scoreOf(m, s.events);
  const showScore = hasScore(m);
  const size = big ? 120 : 96;
  return (
    <div style={{ display: "flex", flexDirection: "column", background: C.surface, border: `2px solid ${C.line}`, borderRadius: 32, padding: 28, marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: C.muted, marginBottom: 16 }}>
        <span>{matchStageLabel(s, m)}</span>
        <span>{m.scheduled_at ? `${formatWeekday(m.scheduled_at)} ${formatShortDate(m.scheduled_at)} • ${formatTime(m.scheduled_at)}` : "Horário a definir"}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", flex: 1, alignItems: "center" }}>
          <CrestBox team={home} src={home ? crests.get(home.id) : null} size={size} />
          <span style={{ marginLeft: 20, fontSize: big ? 52 : 44, fontWeight: 800, textTransform: "uppercase", maxWidth: 300 }}>{home?.name ?? "A definir"}</span>
        </div>
        <span style={{ fontSize: big ? 96 : 80, fontWeight: 800, color: showScore ? C.ink : C.muted, padding: "0 20px" }}>{showScore ? `${sc.home} × ${sc.away}` : "×"}</span>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
          <span style={{ marginRight: 20, fontSize: big ? 52 : 44, fontWeight: 800, textTransform: "uppercase", maxWidth: 300, textAlign: "right" }}>{away?.name ?? "A definir"}</span>
          <CrestBox team={away} src={away ? crests.get(away.id) : null} size={size} />
        </div>
      </div>
      {m.home_penalties != null ? (
        <div style={{ display: "flex", justifyContent: "center", fontSize: 28, color: C.muted, marginTop: 8 }}>
          Pênaltis {m.home_penalties} × {m.away_penalties}
        </div>
      ) : null}
    </div>
  );
}

/** Confrontos ou resultados de uma rodada. */
export async function roundCard(s: Snapshot, roundId: string | null, kind: "fixtures" | "results", format: CardFormat) {
  const round = roundId ? s.rounds.find((r) => r.id === roundId) : null;
  let matches = orderedMatches(s).filter((m) => (round ? m.round_id === round.id : true));
  matches = kind === "results" ? matches.filter((m) => m.status === "finished") : matches.filter((m) => m.status !== "finished" && m.status !== "cancelled");
  matches = matches.slice(0, format === "story" ? 6 : 4);
  const crests = await crestMap(s.teams);
  const venue = matches.find((m) => m.venue)?.venue ?? s.edition.venue;
  return renderCard(
    <Frame format={format} eyebrow={`${s.edition.name}${round ? ` • ${round.name}` : ""}`} title={kind === "results" ? "Resultados" : "Confrontos"} footer={`${venue ? `${venue} • ` : ""}${footer()}`}>
      {matches.length === 0 ? (
        <div style={{ display: "flex", fontSize: 48, color: C.muted }}>{kind === "results" ? "Nenhum resultado ainda." : "Nenhum jogo agendado."}</div>
      ) : (
        matches.map((m) => <MatchRow key={m.id} s={s} m={m} crests={crests} big={format === "story"} />)
      )}
    </Frame>,
    format,
  );
}

export async function scorersCard(s: Snapshot, format: CardFormat) {
  const rows = leaderboard(s, "goals").slice(0, format === "story" ? 10 : 7);
  const photos = new Map(await Promise.all(rows.map(async (r) => [r.entry.player.id, await embedImage(r.entry.player.photo_url)] as const)));
  const crests = await crestMap(s.teams);
  return renderCard(
    <Frame format={format} eyebrow={s.edition.name} title="Artilharia" footer={footer()}>
      {rows.length === 0 ? (
        <div style={{ display: "flex", fontSize: 48, color: C.muted }}>Nenhum gol registrado ainda.</div>
      ) : (
        rows.map((r) => {
          const photo = photos.get(r.entry.player.id);
          return (
            <div key={r.entry.player.id} style={{ display: "flex", alignItems: "center", height: format === "story" ? 128 : 116, borderBottom: `2px solid ${C.line}` }}>
              <span style={{ width: 80, fontSize: 52, fontWeight: 800, color: r.rank === 1 ? C.gold : C.muted }}>{r.rank}º</span>
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} width={84} height={84} style={{ borderRadius: 42, objectFit: "cover" }} alt="" />
              ) : (
                <CrestBox team={r.entry.team} src={r.entry.team ? crests.get(r.entry.team.id) : null} size={84} />
              )}
              <div style={{ display: "flex", flexDirection: "column", flex: 1, marginLeft: 24 }}>
                <span style={{ fontSize: 50, fontWeight: 800, textTransform: "uppercase" }}>{displayName(r.entry.player)}</span>
                <span style={{ fontSize: 30, color: C.muted }}>{r.entry.team?.name ?? ""}</span>
              </div>
              <span style={{ fontSize: 72, fontWeight: 800, color: C.accent }}>{r.value}</span>
            </div>
          );
        })
      )}
    </Frame>,
    format,
  );
}

/** Imagem de preview (Open Graph) de uma partida. */
export async function matchOgCard(s: Snapshot, m: Match) {
  const crests = await crestMap(s.teams);
  return renderCard(
    <Frame format="og" eyebrow={s.edition.name} title={matchStageLabel(s, m)} footer={footer()}>
      <MatchRow s={s} m={m} crests={crests} big={false} />
    </Frame>,
    "og",
    300,
  );
}

export async function siteOgCard(s: Snapshot | null, customImageUrl?: string | null) {
  const name = s?.edition.name ?? "Torneio da Pelada do Caps";
  const custom = await embedImage(customImageUrl);
  if (custom) {
    return renderCard(
      // eslint-disable-next-line @next/next/no-img-element
      <img src={custom} width={1200} height={630} style={{ objectFit: "cover" }} alt="" />,
      "og",
      3600,
    );
  }
  const logo = await embedImage(s?.edition.logo_url);
  return renderCard(
    <div style={{ width: 1200, height: 630, display: "flex", alignItems: "center", padding: 72, background: `radial-gradient(circle at 20% 10%, #0b3a78 0%, ${C.bg} 60%)`, color: C.ink, fontFamily: "Barlow Condensed" }}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: 34, color: C.accent, letterSpacing: 6, fontWeight: 600 }}>{(s?.edition.venue ?? "INTER ACADEMY").toUpperCase()} • {s?.edition.season ?? "2026"}</span>
        <span style={{ fontSize: 110, fontWeight: 800, lineHeight: 0.92, textTransform: "uppercase", marginTop: 12 }}>{name}</span>
        <span style={{ fontSize: 34, color: C.muted, marginTop: 24 }}>Jogos • Classificação • Artilharia • Notícias</span>
      </div>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} width={260} height={260} style={{ objectFit: "contain" }} alt="" />
      ) : (
        <div style={{ display: "flex", width: 240, height: 240, borderRadius: 120, border: `8px solid ${C.accent}`, alignItems: "center", justifyContent: "center", fontSize: 110, fontWeight: 800 }}>PC</div>
      )}
    </div>,
    "og",
    3600,
  );
}

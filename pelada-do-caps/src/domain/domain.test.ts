import { describe, expect, it } from "vitest";
import { calendarDateToIso, isoToZonedInput, zonedInputToIso } from "@/lib/format";
import { finalOutcome, planBracketSync, resolveBracket } from "./bracket";
import { computeDiscipline } from "./discipline";
import { event, goals, match, player, registration, snapshot, team } from "./fixtures.test-helpers";
import { parseRules, presetSlots } from "./rules";
import { scoreOf } from "./score";
import { buildShareText } from "./share-text";
import { computeStandings } from "./standings";
import { computePlayerStats, leaderboard } from "./stats";

const A = team("Azul", 1);
const B = team("Branco", 2);
const C = team("Cinza", 3);
const D = team("Dourado", 4);
const teams = [A, B, C, D];

describe("placar e classificação derivados da súmula", () => {
  it("recalcula tudo quando um gol é removido (correção 4×2 → 3×2)", () => {
    const joao = player("Joao");
    const pedro = player("Pedro");
    const lucas = player("Lucas");
    const m = match(A, B, 2);
    const joaoGoals = [event(m, "goal", A, joao), event(m, "goal", A, joao)];
    const events = [...joaoGoals, event(m, "goal", A, pedro), event(m, "goal", A, lucas), ...goals(m, B, 2)];
    const base = {
      teams,
      players: [joao, pedro, lucas],
      registrations: [registration(joao, A), registration(pedro, A), registration(lucas, A)],
      matches: [m],
    };

    const before = snapshot({ ...base, events });
    expect(scoreOf(m, before.events)).toEqual({ home: 4, away: 2 });
    expect(computeStandings(before.teams, before.matches, before.events, before.rules)[0]).toMatchObject({
      team: A,
      goalsFor: 4,
      goalsAgainst: 2,
      goalDifference: 2,
      points: 3,
    });
    expect(leaderboard(before, "goals")[0]).toMatchObject({ value: 2, entry: { player: joao } });

    const after = snapshot({ ...base, events: events.filter((e) => e !== joaoGoals[1]) });
    expect(scoreOf(m, after.events)).toEqual({ home: 3, away: 2 });
    const row = computeStandings(after.teams, after.matches, after.events, after.rules)[0];
    expect(row).toMatchObject({ goalsFor: 3, goalDifference: 1, points: 3 });
    expect(computePlayerStats(after).get(joao.id)?.goals).toBe(1);
  });

  it("usa os pontos configurados e ignora jogos não encerrados e mata-mata", () => {
    const m1 = match(A, B, 2);
    const m2 = match(C, D, 2, { status: "live" });
    const m3 = match(A, C, 19, { phase: "knockout" });
    const s = snapshot({
      teams,
      matches: [m1, m2, m3],
      events: [...goals(m1, A, 1), ...goals(m1, B, 1), ...goals(m2, C, 3), ...goals(m3, A, 5)],
      rules: { points: { win: 2, draw: 1, loss: 0 } },
    });
    const rows = computeStandings(s.teams, s.matches, s.events, s.rules);
    expect(rows.find((r) => r.team === A)).toMatchObject({ played: 1, draws: 1, points: 1, goalsFor: 1 });
    expect(rows.find((r) => r.team === C)).toMatchObject({ played: 0, points: 0 });
  });

  it("desempata por confronto direto apenas entre os empatados", () => {
    // A e B terminam com 3 pontos, mesmo saldo e gols; B venceu o confronto.
    const ab = match(A, B, 2);
    const ac = match(A, C, 9);
    const bc = match(B, C, 16);
    const s = snapshot({
      teams: [A, B, C],
      matches: [ab, ac, bc],
      events: [...goals(ab, B, 1), ...goals(ac, A, 1), ...goals(bc, C, 1)],
      rules: { tiebreakers: ["points", "goal_difference", "goals_for", "head_to_head"] },
    });
    const rows = computeStandings(s.teams, s.matches, s.events, s.rules);
    // Todos com 3 pontos, saldo 0 e 1 gol: o confronto direto num triplo
    // empate circular também empata; a ordem fica marcada como não resolvida.
    expect(rows.every((r) => r.points === 3)).toBe(true);
    expect(rows.every((r) => r.unresolvedTie)).toBe(true);

    const s2 = snapshot({ ...s, rules: { tiebreakers: ["points", "head_to_head"] }, matches: [ab, ac], events: [...goals(ab, B, 1), ...goals(ac, A, 1)] });
    const rows2 = computeStandings(s2.teams, s2.matches, s2.events, s2.rules);
    expect(rows2.map((r) => r.team.name)).toEqual(["Branco", "Azul", "Cinza"]);
    expect(rows2[0].unresolvedTie).toBe(false);
  });

  it("não marca empate antes do primeiro jogo", () => {
    const s = snapshot({ teams });
    const rows = computeStandings(s.teams, s.matches, s.events, s.rules);
    expect(rows.map((r) => r.position)).toEqual([1, 2, 3, 4]);
    expect(rows.some((r) => r.unresolvedTie)).toBe(false);
  });

  it("gol contra conta no placar, mas não na artilharia", () => {
    const zag = player("Zagueiro");
    const m = match(A, B, 2);
    const s = snapshot({
      teams,
      players: [zag],
      registrations: [registration(zag, B)],
      matches: [m],
      events: [event(m, "own_goal", A, zag)],
    });
    expect(scoreOf(m, s.events)).toEqual({ home: 1, away: 0 });
    expect(leaderboard(s, "goals")).toEqual([]);
    expect(computePlayerStats(s).get(zag.id)?.ownGoals).toBe(1);
  });

  it("conta jogos pela escalação quando existe, senão pelo elenco", () => {
    const p1 = player("Um");
    const p2 = player("Dois");
    const m1 = match(A, B, 2);
    const m2 = match(A, C, 9);
    const s = snapshot({
      teams,
      players: [p1, p2],
      registrations: [registration(p1, A), registration(p2, A)],
      matches: [m1, m2],
      lineups: [{ match_id: m2.id, team_id: A.id, player_id: p1.id }],
    });
    const stats = computePlayerStats(s);
    expect(stats.get(p1.id)?.games).toBe(2);
    expect(stats.get(p2.id)?.games).toBe(1);
  });
});

describe("disciplina configurável", () => {
  const p = player("Jogador");
  const base = (matches: ReturnType<typeof match>[], events: ReturnType<typeof event>[], rules = {}) =>
    snapshot({ teams, players: [p], registrations: [registration(p, A)], matches, events, rules });

  it("sem regras configuradas não gera suspensão automática", () => {
    const m1 = match(A, B, 2);
    const s = base([m1], [event(m1, "red", A, p)]);
    expect(computeDiscipline(s).get(p.id)).toMatchObject({ red: 1, suspended: false });
  });

  it("vermelho suspende e é cumprido na partida seguinte do time", () => {
    const m1 = match(A, B, 2);
    const m2 = match(A, C, 9, { status: "scheduled", finished_at: null });
    const rules = { discipline: { redSuspensionMatches: 1 } };
    const pending = computeDiscipline(base([m1, m2], [event(m1, "red", A, p)], rules)).get(p.id)!;
    expect(pending).toMatchObject({ suspended: true, remaining: 1, nextMissedMatchId: m2.id });

    const served = computeDiscipline(
      base([m1, { ...m2, status: "finished", finished_at: "2026-11-09T23:00:00Z" }], [event(m1, "red", A, p)], rules),
    ).get(p.id)!;
    expect(served).toMatchObject({ suspended: false, remaining: 0 });
  });

  it("acumula amarelos e cumpre suspensões em sequência", () => {
    const m1 = match(A, B, 2);
    const m2 = match(A, C, 9);
    const m3 = match(A, D, 16, { status: "scheduled", finished_at: null });
    const m4 = match(A, B, 19, { status: "scheduled", finished_at: null, phase: "knockout" });
    const rules = { discipline: { yellowsForSuspension: 2, yellowSuspensionMatches: 1, redSuspensionMatches: 1 } };
    const events = [event(m1, "yellow", A, p), event(m2, "yellow", A, p), event(m2, "red", A, p)];
    // Com redCancelsSameMatchYellows (padrão), o amarelo do jogo do vermelho não acumula.
    const status = computeDiscipline(base([m1, m2, m3, m4], events, rules)).get(p.id)!;
    expect(status.entries.map((e) => e.source)).toEqual(["red"]);
    expect(status.remaining).toBe(1);

    const counting = computeDiscipline(
      base([m1, m2, m3, m4], events, { discipline: { ...rules.discipline, redCancelsSameMatchYellows: false } }),
    ).get(p.id)!;
    expect(counting.entries.map((e) => e.source).sort()).toEqual(["red", "yellow"]);
    expect(counting.remaining).toBe(2);
    expect(counting.nextMissedMatchId).toBe(m3.id);
  });

  it("anulação manual remove a suspensão automática", () => {
    const m1 = match(A, B, 2);
    const m2 = match(A, C, 9, { status: "scheduled", finished_at: null });
    const s = base([m1, m2], [event(m1, "red", A, p)], { discipline: { redSuspensionMatches: 1 } });
    const key = computeDiscipline(s).get(p.id)!.entries[0].key;
    s.suspensions = [
      {
        id: "void-1",
        edition_id: "ed",
        player_id: p.id,
        kind: "void_auto",
        matches: null,
        from_match_id: null,
        auto_key: key,
        reason: "Cartão aplicado por engano",
        created_at: "2026-11-03T00:00:00Z",
      },
    ];
    expect(computeDiscipline(s).get(p.id)).toMatchObject({ suspended: false });
  });

  it("suspensão manual é cumprida nos jogos após o registro", () => {
    const m1 = match(A, B, 2);
    const m2 = match(A, C, 9, { status: "scheduled", finished_at: null });
    const s = base([m1, m2], []);
    s.suspensions = [
      {
        id: "man-1",
        edition_id: "ed",
        player_id: p.id,
        kind: "manual",
        matches: 1,
        from_match_id: null,
        auto_key: null,
        reason: "Decisão da comissão",
        created_at: "2026-11-05T00:00:00Z",
      },
    ];
    expect(computeDiscipline(s).get(p.id)).toMatchObject({ suspended: true, nextMissedMatchId: m2.id });
  });
});

describe("mata-mata configurável", () => {
  const groupStage = () => {
    const pairs: [typeof A, typeof A, number][] = [
      [A, B, 2], [C, D, 2], [A, C, 9], [B, D, 9], [A, D, 16], [B, C, 16],
    ];
    const matches = pairs.map(([h, a, d]) => match(h, a, d));
    // O mandante vence sempre: A 9 pts, B 6, C 3, D 0.
    const events = matches.flatMap((m) => goals(m, teams.find((t) => t.id === m.home_team_id)!, 1));
    return { matches, events };
  };

  it("valida dependências do chaveamento", () => {
    const bad = presetSlots("semis_1v4_2v3", null, null).reverse();
    const parsed = parseRules({ knockout: { preset: "custom", slots: bad } });
    expect(parsed.ok).toBe(false);
  });

  it("só preenche posições quando a fase classificatória termina", () => {
    const { matches, events } = groupStage();
    const slots = presetSlots("semis_1v4_2v3", null, null);
    const partial = snapshot({ teams, matches: matches.slice(0, 5), events, rules: { knockout: { preset: "semis_1v4_2v3", slots } } });
    partial.matches.push({ ...matches[5], status: "scheduled" });
    expect(resolveBracket(partial).every((n) => n.home.teamId === null)).toBe(true);

    const full = snapshot({ teams, matches, events, rules: { knockout: { preset: "semis_1v4_2v3", slots } } });
    const nodes = resolveBracket(full);
    expect(nodes[0]).toMatchObject({ home: { teamId: A.id }, away: { teamId: D.id } });
    expect(nodes[1]).toMatchObject({ home: { teamId: B.id }, away: { teamId: C.id } });
    expect(nodes[2]).toMatchObject({ isFinal: true, home: { teamId: null } });

    const plan = planBracketSync(full);
    expect(plan.create.map((c) => [c.slot.key, c.home, c.away])).toEqual([
      ["SF1", A.id, D.id],
      ["SF2", B.id, C.id],
      ["F", null, null],
    ]);
  });

  it("propaga vencedores (inclusive nos pênaltis) e define o campeão", () => {
    const { matches, events } = groupStage();
    const slots = presetSlots("final_top1_semi_2v3", null, null);
    const sf = match(B, C, 17, { phase: "knockout", bracket_slot: "SF", home_penalties: 3, away_penalties: 4 });
    const final = match(null, null, 19, { phase: "knockout", bracket_slot: "F", status: "scheduled", finished_at: null });
    const s = snapshot({
      teams,
      matches: [...matches, sf, final],
      events: [...events, ...goals(sf, B, 1), ...goals(sf, C, 1)],
      rules: { knockout: { preset: "final_top1_semi_2v3", slots } },
    });
    expect(planBracketSync(s).update).toEqual([{ matchId: final.id, home: A.id, away: C.id }]);

    const decided = { ...final, home_team_id: A.id, away_team_id: C.id, status: "finished" as const };
    const s2 = { ...s, matches: [...matches, sf, decided], events: [...s.events, ...goals(decided, C, 2)] };
    expect(finalOutcome(s2)).toMatchObject({ championId: C.id, runnerUpId: A.id });
  });

  it("respeita ajuste manual travado", () => {
    const { matches, events } = groupStage();
    const slots = presetSlots("final_top2", null, null);
    const final = match(C, D, 19, { phase: "knockout", bracket_slot: "F", status: "scheduled", teams_locked: true });
    const s = snapshot({ teams, matches: [...matches, final], events, rules: { knockout: { preset: "final_top2", slots } } });
    expect(planBracketSync(s)).toEqual({ create: [], update: [] });
  });
});

describe("datas no fuso do torneio", () => {
  it("converte horário de Fortaleza (UTC−3) de e para UTC", () => {
    expect(zonedInputToIso("2026-11-02T19:30")).toBe("2026-11-02T22:30:00.000Z");
    expect(isoToZonedInput("2026-11-02T22:30:00.000Z")).toBe("2026-11-02T19:30");
    expect(calendarDateToIso("2026-11-19")).toBe("2026-11-19T03:00:00.000Z");
  });
});

describe("texto para WhatsApp", () => {
  it("é gerado a partir dos dados atuais com estados vazios", () => {
    const s = snapshot({ teams });
    const text = buildShareText(s, ["standings", "upcoming", "scorers"], "https://peladadocaps.com");
    expect(text).toContain("🏆 *1º TORNEIO DA PELADA DO CAPS*");
    expect(text).toContain("1º Azul — 0 pts");
    expect(text).toContain("Nenhum gol registrado ainda.");
    expect(text).toContain("https://peladadocaps.com");
  });
});

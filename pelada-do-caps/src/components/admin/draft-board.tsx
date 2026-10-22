"use client";

import { Loader2, Search, Shuffle, Undo2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { assignPlayer, autoDraft, undoLastDraft } from "@/actions/draft";
import type { ActionResult } from "@/actions/_lib";
import { afterSave, runAction } from "./after-save";
import { toast } from "./toast";

export interface DraftPlayer {
  id: string;
  name: string;
  nickname: string | null;
  position: string | null;
  goalkeeper: boolean;
  pot: string | null;
  teamId: string | null;
}

export interface DraftTeam {
  id: string;
  name: string;
  color: string;
  crest: React.ReactNode;
}

const label = (p: DraftPlayer) => p.nickname || p.name;

function PlayerTag({ p }: { p: DraftPlayer }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-semibold">{label(p)}</span>
      <span className="flex flex-wrap gap-1 text-[0.7rem] text-muted">
        {p.goalkeeper ? <span className="rounded bg-accent/15 px-1 font-bold text-accent">GOL</span> : null}
        {p.position && p.position !== "GOL" ? <span>{p.position}</span> : null}
        {p.pot ? <span>Pote {p.pot}</span> : null}
        {p.nickname ? <span className="truncate">{p.name}</span> : null}
      </span>
    </span>
  );
}

/**
 * Quadro do sorteio: o administrador acompanha o sorteio real e, a cada
 * jogador sorteado, toca no time correspondente. Tudo é salvo na hora e
 * aparece na página pública /sorteio sem recarregar.
 */
export function DraftBoard({ players: serverPlayers, teams, maxPerTeam }: { players: DraftPlayer[]; teams: DraftTeam[]; maxPerTeam: number | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  // O jogador muda de time na tela no mesmo instante; a jogada fica guardada
  // até a tela atualizada do servidor chegar com ela (ou ser desfeita se falhar).
  const [moves, setMoves] = useState<Record<string, { teamId: string | null; saved: boolean }>>({});
  useEffect(() => {
    setMoves((current) => {
      const team = new Map(serverPlayers.map((p) => [p.id, p.teamId]));
      const kept = Object.entries(current).filter(([id, m]) => !m.saved && team.get(id) !== m.teamId);
      return kept.length === Object.keys(current).length ? current : Object.fromEntries(kept);
    });
  }, [serverPlayers]);
  const players = useMemo(
    () => serverPlayers.map((p) => (moves[p.id] ? { ...p, teamId: moves[p.id].teamId } : p)),
    [serverPlayers, moves],
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState("");
  const [pot, setPot] = useState("");
  const [onlyGk, setOnlyGk] = useState(false);

  const pots = useMemo(() => [...new Set(players.map((p) => p.pot).filter(Boolean))].sort() as string[], [players]);
  const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const unassigned = players.filter(
    (p) =>
      !p.teamId &&
      (!query || norm(`${p.name} ${p.nickname ?? ""}`).includes(norm(query))) &&
      (!position || p.position === position) &&
      (!pot || p.pot === pot) &&
      (!onlyGk || p.goalkeeper),
  );
  const totalUnassigned = players.filter((p) => !p.teamId).length;

  const run = (id: string | null, action: () => Promise<ActionResult>, move?: { id: string; teamId: string | null }) => {
    setBusyId(id);
    if (move) setMoves((m) => ({ ...m, [move.id]: { teamId: move.teamId, saved: false } }));
    start(async () => {
      const result = await runAction(action);
      setBusyId(null);
      if (move) {
        setMoves((m) => {
          if (m[move.id]?.teamId !== move.teamId) return m;
          if (result.ok) return { ...m, [move.id]: { ...m[move.id], saved: true } };
          const { [move.id]: _undone, ...rest } = m;
          return rest;
        });
      }
      if (result.ok) toast("success", result.message ?? "Salvo.");
      else toast("error", result.error);
      afterSave(router);
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-secondary btn-sm" disabled={pending} onClick={() => run(null, undoLastDraft)}>
          <Undo2 className="size-4" aria-hidden /> Desfazer última alteração
        </button>
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={pending || totalUnassigned === 0}
          onClick={() => {
            if (window.confirm(`Distribuir automaticamente os ${totalUnassigned} jogadores sem time? Isso é opcional e pode ser desfeito.`)) run(null, autoDraft);
          }}
        >
          <Shuffle className="size-4" aria-hidden /> Sorteio automático (opcional)
        </button>
        {pending ? <Loader2 className="size-4 animate-spin text-accent" aria-label="Salvando" /> : null}
        <a href="/sorteio" target="_blank" className="ml-auto text-sm text-accent underline">
          Abrir página pública do sorteio
        </a>
      </div>

      <div className="grid gap-5 xl:grid-cols-[22rem_1fr]">
        <section className="card flex max-h-[80vh] flex-col overflow-hidden" aria-labelledby="h-sem-time">
          <div className="space-y-3 border-b border-line p-4">
            <h2 id="h-sem-time" className="flex items-center justify-between font-display text-xl font-extrabold uppercase">
              Sem time <span className="tabular rounded-full bg-surface-3 px-2.5 py-0.5 text-sm">{totalUnassigned}</span>
            </h2>
            <label className="relative block">
              <span className="sr-only">Buscar jogador</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input className="input py-2 pl-9" placeholder="Buscar" value={query} onChange={(e) => setQuery(e.target.value)} type="search" />
            </label>
            <div className="flex flex-wrap gap-2">
              <select className="input w-auto py-1.5 text-sm" value={position} onChange={(e) => setPosition(e.target.value)} aria-label="Filtrar por posição">
                <option value="">Posição</option>
                {["GOL", "ZAG", "LAT", "VOL", "MEI", "ATA"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              {pots.length ? (
                <select className="input w-auto py-1.5 text-sm" value={pot} onChange={(e) => setPot(e.target.value)} aria-label="Filtrar por pote">
                  <option value="">Pote</option>
                  {pots.map((p) => (
                    <option key={p} value={p}>
                      Pote {p}
                    </option>
                  ))}
                </select>
              ) : null}
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={onlyGk} onChange={(e) => setOnlyGk(e.target.checked)} className="size-4 accent-[var(--color-accent)]" />
                Só goleiros
              </label>
            </div>
          </div>
          <ul className="flex-1 divide-y divide-line overflow-y-auto">
            {unassigned.length === 0 ? (
              <li className="p-4 text-sm text-muted">{totalUnassigned === 0 ? "Todos os jogadores já têm time. 🎉" : "Nenhum jogador neste filtro."}</li>
            ) : (
              unassigned.map((p) => (
                <li key={p.id} className="space-y-2 px-4 py-3">
                  <PlayerTag p={p} />
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Enviar ${label(p)} para`}>
                    {teams.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => run(p.id, () => assignPlayer(p.id, t.id), { id: p.id, teamId: t.id })}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors hover:bg-surface-3 disabled:opacity-50"
                        style={{ borderColor: t.color }}
                      >
                        {busyId === p.id ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <span className="size-2 rounded-full" style={{ background: t.color }} aria-hidden />}
                        {t.name}
                      </button>
                    ))}
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          {teams.map((t) => {
            const roster = players.filter((p) => p.teamId === t.id);
            const gks = roster.filter((p) => p.goalkeeper).length;
            const potCount = pots.map((x) => [x, roster.filter((p) => p.pot === x).length] as const).filter(([, n]) => n);
            const full = maxPerTeam != null && roster.length >= maxPerTeam;
            return (
              <section key={t.id} className="card overflow-hidden" aria-label={t.name} style={{ borderTop: `4px solid ${t.color}` }}>
                <header className="flex items-center gap-3 border-b border-line p-4">
                  {t.crest}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-xl font-extrabold uppercase">{t.name}</h3>
                    <p className="text-xs text-muted">
                      {gks} {gks === 1 ? "goleiro" : "goleiros"}
                      {potCount.length ? ` • ${potCount.map(([x, n]) => `P${x}: ${n}`).join(" • ")}` : ""}
                    </p>
                  </div>
                  <span className={`tabular rounded-full px-2.5 py-1 text-sm font-bold ${full ? "bg-warning/20 text-warning" : "bg-surface-3"}`}>
                    {roster.length}
                    {maxPerTeam ? `/${maxPerTeam}` : ""}
                  </span>
                </header>
                {roster.length === 0 ? (
                  <p className="p-4 text-sm text-muted">Aguardando jogadores.</p>
                ) : (
                  <ul className="divide-y divide-line/70">
                    {roster.map((p) => (
                      <li key={p.id} className="flex items-center gap-2 px-4 py-2">
                        <PlayerTag p={p} />
                        <select
                          aria-label={`Mover ${label(p)}`}
                          className="input w-auto max-w-32 py-1 text-xs"
                          value={t.id}
                          onChange={(e) => run(p.id, () => assignPlayer(p.id, e.target.value || null), { id: p.id, teamId: e.target.value || null })}
                        >
                          {teams.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn-ghost btn-sm px-2"
                          onClick={() => run(p.id, () => assignPlayer(p.id, null), { id: p.id, teamId: null })}
                          aria-label={`Remover ${label(p)} do ${t.name}`}
                        >
                          <X className="size-4" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

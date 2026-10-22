"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export interface DirectoryPlayer {
  slug: string;
  name: string;
  nickname: string | null;
  photo: React.ReactNode;
  teamName: string | null;
  teamColor: string | null;
  teamId: string | null;
  position: string | null;
  goals: number;
}

const normalize = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Lista de jogadores com busca e filtro por time, sem recarregar a página. */
export function PlayerDirectory({ players, teams }: { players: DirectoryPlayer[]; teams: { id: string; name: string }[] }) {
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState("");
  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return players.filter(
      (p) =>
        (!team || (team === "none" ? !p.teamId : p.teamId === team)) &&
        (!q || normalize(`${p.name} ${p.nickname ?? ""}`).includes(q)),
    );
  }, [players, query, team]);
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Buscar jogador</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            className="input pl-10"
            placeholder="Buscar por nome ou apelido"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Filtrar por time</span>
          <select className="input sm:w-56" value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="">Todos os times</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
            <option value="none">Sem time</option>
          </select>
        </label>
      </div>
      <p className="text-sm text-muted" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "jogador" : "jogadores"}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <li key={p.slug}>
            <Link href={`/jogadores/${p.slug}`} className="card card-hover flex items-center gap-3 p-3">
              {p.photo}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{p.nickname || p.name}</span>
                <span className="flex items-center gap-1.5 truncate text-xs text-muted">
                  {p.teamColor ? <span className="size-2 rounded-full" style={{ background: p.teamColor }} aria-hidden /> : null}
                  {p.teamName ?? "Sem time"}
                  {p.position ? ` • ${p.position}` : ""}
                </span>
              </span>
              {p.goals > 0 ? (
                <span className="tabular text-sm font-bold text-accent" title="Gols">
                  {p.goals} ⚽
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

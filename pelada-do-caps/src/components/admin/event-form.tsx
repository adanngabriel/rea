"use client";

import { useState } from "react";
import type { ActionResult } from "@/actions/_lib";
import { ActionForm, SubmitButton } from "./form";

export interface SideOption {
  id: string;
  name: string;
  color: string;
  players: { id: string; label: string }[];
}

const TYPES = [
  { value: "goal", label: "⚽ Gol" },
  { value: "own_goal", label: "Gol contra" },
  { value: "yellow", label: "🟨 Amarelo" },
  { value: "red", label: "🟥 Vermelho" },
] as const;

/** Lançamento rápido de gol/cartão: escolha o tipo, o time e o jogador. */
export function EventForm({ action, sides }: { action: (form: FormData) => Promise<ActionResult>; sides: SideOption[] }) {
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("goal");
  const [teamId, setTeamId] = useState(sides[0]?.id ?? "");
  const side = sides.find((s) => s.id === teamId);
  return (
    <ActionForm action={action} success="Lance registrado." className="space-y-4">
      <fieldset>
        <legend className="field-label">Lance</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TYPES.map((t) => (
            <label key={t.value} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold ${type === t.value ? "border-accent bg-accent/10 text-accent" : "border-line-strong"}`}>
              <input type="radio" name="type" value={t.value} checked={type === t.value} onChange={() => setType(t.value)} className="sr-only" />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="field-label">{type === "own_goal" ? "Time do jogador que fez o gol contra" : "Time"}</legend>
        <div className="grid grid-cols-2 gap-2">
          {sides.map((s) => (
            <label
              key={s.id}
              className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-2 text-sm font-semibold ${teamId === s.id ? "bg-surface-3" : "border-line-strong"}`}
              style={teamId === s.id ? { borderColor: s.color } : undefined}
            >
              <input type="radio" name="team_id" value={s.id} checked={teamId === s.id} onChange={() => setTeamId(s.id)} className="sr-only" />
              <span className="size-2.5 rounded-full" style={{ background: s.color }} aria-hidden />
              <span className="truncate">{s.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Jogador</span>
          <select name="player_id" className="input" key={`p-${teamId}`} defaultValue="">
            <option value="">{type === "goal" ? "Autor não identificado" : "Escolha o jogador"}</option>
            {side?.players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        {type === "goal" ? (
          <label className="block">
            <span className="field-label">Assistência (opcional)</span>
            <select name="assist_player_id" className="input" key={`a-${teamId}`} defaultValue="">
              <option value="">Sem assistência</option>
              {side?.players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="assist_player_id" value="" />
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
        <label className="block">
          <span className="field-label">Minuto</span>
          <input name="minute" type="number" min={0} max={200} inputMode="numeric" className="input" placeholder="Opcional" />
        </label>
        <label className="block">
          <span className="field-label">Observação</span>
          <input name="notes" className="input" maxLength={200} placeholder="Opcional (ex.: pênalti)" />
        </label>
      </div>
      <SubmitButton className="btn-primary w-full sm:w-auto">Registrar lance</SubmitButton>
    </ActionForm>
  );
}

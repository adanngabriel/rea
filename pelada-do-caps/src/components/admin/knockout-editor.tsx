"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { saveKnockout } from "@/actions/edition";
import { KNOCKOUT_PRESET_LABELS, KNOCKOUT_PRESETS, presetSlots, type BracketSlot, type BracketSource, type KnockoutPreset } from "@/domain/rules";
import { ActionForm, SubmitButton } from "./form";

const encode = (s: BracketSource) => (s.type === "position" ? `position:${s.position}` : `${s.type}:${s.slot}`);

/** Editor do formato do mata-mata: modelos prontos ou jogos personalizados. */
export function KnockoutEditor({
  initialPreset,
  initialSlots,
  rounds,
  teamCount,
}: {
  initialPreset: KnockoutPreset;
  initialSlots: BracketSlot[];
  rounds: { id: string; name: string; phase: string }[];
  teamCount: number;
}) {
  const knockoutRounds = rounds.filter((r) => r.phase === "knockout");
  const finalRound = knockoutRounds[knockoutRounds.length - 1]?.id ?? null;
  const semiRound = knockoutRounds.length > 1 ? knockoutRounds[knockoutRounds.length - 2].id : null;
  const [preset, setPreset] = useState<KnockoutPreset>(initialPreset);
  const [slots, setSlots] = useState<BracketSlot[]>(initialSlots);

  const choose = (p: KnockoutPreset) => {
    setPreset(p);
    if (p !== "custom") setSlots(presetSlots(p, finalRound, semiRound));
  };
  const update = (i: number, patch: Partial<BracketSlot>) => {
    setPreset("custom");
    setSlots((list) => list.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  };
  const sourceOptions = (i: number) => [
    ...Array.from({ length: Math.max(teamCount, 2) }, (_, k) => ({ value: `position:${k + 1}`, label: `${k + 1}º colocado` })),
    ...slots.slice(0, i).flatMap((s) => [
      { value: `winner:${s.key}`, label: `Vencedor ${s.label}` },
      { value: `loser:${s.key}`, label: `Perdedor ${s.label}` },
    ]),
  ];
  const decode = (v: string): BracketSource => {
    const [type, value] = v.split(":");
    return type === "position" ? { type: "position", position: Number(value) } : { type: type as "winner" | "loser", slot: value };
  };

  return (
    <ActionForm action={saveKnockout} success="Formato do mata-mata salvo." className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="field-label">Modelo</legend>
        {KNOCKOUT_PRESETS.map((p) => (
          <label key={p} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm ${preset === p ? "border-accent bg-accent/5" : "border-line"}`}>
            <input type="radio" name="preset" value={p} checked={preset === p} onChange={() => choose(p)} className="accent-[var(--color-accent)]" />
            {KNOCKOUT_PRESET_LABELS[p]}
          </label>
        ))}
      </fieldset>
      {preset !== "none" ? (
        <div className="space-y-3">
          <p className="field-label">Jogos do mata-mata (na ordem em que acontecem)</p>
          <input type="hidden" name="slot_count" value={slots.length} />
          {slots.map((slot, i) => (
            <div key={i} className="grid gap-3 rounded-2xl border border-line p-3 sm:grid-cols-2 lg:grid-cols-[1fr_6rem_1fr_1fr_1fr_auto]">
              <label>
                <span className="field-label text-xs">Nome</span>
                <input className="input" name={`slot_${i}_label`} value={slot.label} onChange={(e) => update(i, { label: e.target.value })} maxLength={60} />
              </label>
              <label>
                <span className="field-label text-xs">Código</span>
                <input className="input" name={`slot_${i}_key`} value={slot.key} onChange={(e) => update(i, { key: e.target.value.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 16) })} />
              </label>
              <label>
                <span className="field-label text-xs">Rodada</span>
                <select className="input" name={`slot_${i}_roundId`} value={slot.roundId ?? ""} onChange={(e) => update(i, { roundId: e.target.value || null })}>
                  <option value="">Sem rodada</option>
                  {rounds.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              {(["home", "away"] as const).map((side) => (
                <label key={side}>
                  <span className="field-label text-xs">{side === "home" ? "Time A" : "Time B"}</span>
                  <select className="input" name={`slot_${i}_${side}`} value={encode(slot[side])} onChange={(e) => update(i, { [side]: decode(e.target.value) })}>
                    {sourceOptions(i).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <button
                type="button"
                className="btn-ghost btn-sm self-end"
                onClick={() => {
                  setPreset("custom");
                  setSlots((l) => l.filter((_, j) => j !== i));
                }}
                aria-label={`Remover ${slot.label}`}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => {
              setPreset("custom");
              setSlots((l) => [
                ...l,
                { key: `J${l.length + 1}`, label: `Jogo ${l.length + 1}`, roundId: finalRound, home: { type: "position", position: 1 }, away: { type: "position", position: 2 } },
              ]);
            }}
          >
            <Plus className="size-4" aria-hidden /> Adicionar jogo
          </button>
        </div>
      ) : null}
      <SubmitButton>Salvar formato</SubmitButton>
    </ActionForm>
  );
}

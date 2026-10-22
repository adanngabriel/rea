"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useState } from "react";

/**
 * Lista ordenável (sem arrastar, funciona bem no celular): cada item vira
 * um <input hidden name=...> na ordem escolhida.
 */
export function OrderEditor({
  name,
  options,
  initial,
  allowRemove = true,
}: {
  name: string;
  options: { value: string; label: string }[];
  initial: string[];
  allowRemove?: boolean;
}) {
  const [items, setItems] = useState(initial.filter((v) => options.some((o) => o.value === v)));
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  const move = (i: number, d: -1 | 1) =>
    setItems((list) => {
      const next = [...list];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });
  const available = options.filter((o) => !items.includes(o.value));
  return (
    <div className="space-y-2">
      <ol className="space-y-1.5">
        {items.map((v, i) => (
          <li key={v} className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2">
            <input type="hidden" name={name} value={v} />
            <span className="tabular w-6 font-display font-bold text-accent">{i + 1}º</span>
            <span className="flex-1 text-sm">{labelOf(v)}</span>
            <button type="button" className="btn-ghost btn-sm px-2" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Subir ${labelOf(v)}`}>
              <ArrowUp className="size-4" aria-hidden />
            </button>
            <button type="button" className="btn-ghost btn-sm px-2" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Descer ${labelOf(v)}`}>
              <ArrowDown className="size-4" aria-hidden />
            </button>
            {allowRemove ? (
              <button type="button" className="btn-ghost btn-sm px-2" onClick={() => setItems((l) => l.filter((x) => x !== v))} aria-label={`Remover ${labelOf(v)}`}>
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </li>
        ))}
      </ol>
      {available.length && allowRemove ? (
        <div className="flex flex-wrap gap-2">
          {available.map((o) => (
            <button key={o.value} type="button" className="btn-ghost btn-sm" onClick={() => setItems((l) => [...l, o.value])}>
              <Plus className="size-3.5" aria-hidden /> {o.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

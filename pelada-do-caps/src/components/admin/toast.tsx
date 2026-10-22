"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

type Toast = { id: number; kind: "success" | "error"; text: string };
type Listener = (t: Toast) => void;

const listeners = new Set<Listener>();
let seq = 0;

/** Mensagem rápida de sucesso/erro no canto da tela. */
export function toast(kind: Toast["kind"], text: string) {
  const t = { id: ++seq, kind, text };
  for (const l of listeners) l(t);
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const listener: Listener = (t) => {
      setItems((list) => [...list, t]);
      setTimeout(() => setItems((list) => list.filter((x) => x.id !== t.id)), t.kind === "error" ? 7000 : 3500);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6">
      {items.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          className={`pointer-events-auto flex max-w-md animate-fade-up items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm shadow-2xl ${
            t.kind === "success" ? "border-success/40 bg-surface-2 text-ink" : "border-danger/50 bg-surface-2 text-ink"
          }`}
        >
          {t.kind === "success" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          ) : (
            <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
          )}
          {t.text}
        </div>
      ))}
    </div>
  );
}

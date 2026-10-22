"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** Contagem regressiva; renderiza no servidor com o valor inicial e
 * atualiza a cada segundo no navegador. */
export function Countdown({ target, kind }: { target: string; kind: "tournament-start" | "next-match" }) {
  const at = Date.parse(target);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const p = parts(now === null ? 0 : at - now);
  const title = kind === "tournament-start" ? "para o início do torneio" : "para o próximo jogo";
  const headline =
    now === null
      ? kind === "tournament-start" ? "Contagem para o início" : "Próximo jogo em"
      : p.days > 0
        ? `Faltam ${p.days} ${p.days === 1 ? "dia" : "dias"} ${title}`
        : kind === "tournament-start" ? "É hoje! A bola vai rolar em" : "Próximo jogo em";
  const units = [
    ["dias", p.days],
    ["horas", p.hours],
    ["min", p.minutes],
    ["seg", p.seconds],
  ] as const;
  return (
    <section aria-label={title} className="card flex flex-col items-center gap-3 p-5 sm:flex-row sm:justify-between sm:p-6">
      <p className="text-center font-display text-xl font-bold uppercase tracking-wide sm:text-left">{headline}</p>
      <div className="flex gap-2" role="timer" aria-live="off">
        {units.map(([label, value]) => (
          <div key={label} className="flex w-16 flex-col items-center rounded-xl border border-line bg-surface-2 py-2">
            <span className="tabular font-display text-3xl font-extrabold leading-none">
              {now === null ? "--" : String(value).padStart(2, "0")}
            </span>
            <span className="mt-1 text-[0.65rem] uppercase tracking-wider text-muted">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

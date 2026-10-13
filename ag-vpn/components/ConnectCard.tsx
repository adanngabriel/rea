"use client";

import { useEffect, useState } from "react";

type Status = "off" | "connecting" | "on";

const locations = [
  { flag: "🇧🇷", name: "Brasil", city: "São Paulo" },
  { flag: "🇺🇸", name: "Estados Unidos", city: "Nova York" },
  { flag: "🇩🇪", name: "Alemanha", city: "Frankfurt" },
  { flag: "🇯🇵", name: "Japão", city: "Tóquio" },
];

/** Demonstração visual do app: não cria nenhuma conexão real. */
export function ConnectCard() {
  const [status, setStatus] = useState<Status>("off");
  const [loc, setLoc] = useState(0);

  useEffect(() => {
    if (status !== "connecting") return;
    const t = setTimeout(() => setStatus("on"), 1200);
    return () => clearTimeout(t);
  }, [status]);

  const toggle = () => setStatus((s) => (s === "off" ? "connecting" : "off"));
  const current = locations[loc];
  const label = { off: "Desconectado", connecting: "Conectando…", on: "Protegido" }[status];

  return (
    <div className="connect-card" aria-label="Demonstração do aplicativo AG VPN">
      <div className="connect-top">
        <span className={`dot dot-${status}`} />
        <span>{label}</span>
      </div>

      <button
        className={`power power-${status}`}
        onClick={toggle}
        aria-pressed={status !== "off"}
        aria-label={status === "off" ? "Conectar" : "Desconectar"}
      >
        <svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true">
          <path d="M12 3v8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <path
            d="M6.3 7.2a8 8 0 1 0 11.4 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div className="connect-meta">
        <div>
          <small>IP visível</small>
          <strong>{status === "on" ? "Oculto" : "Exposto"}</strong>
        </div>
        <div>
          <small>Protocolo</small>
          <strong>WireGuard®</strong>
        </div>
      </div>

      <label className="location">
        <span className="sr-only">Local do servidor</span>
        <span className="flag" aria-hidden="true">
          {current.flag}
        </span>
        <select
          value={loc}
          onChange={(e) => {
            setLoc(Number(e.target.value));
            if (status === "on") setStatus("connecting");
          }}
        >
          {locations.map((l, i) => (
            <option key={l.name} value={i}>
              {l.name} — {l.city}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

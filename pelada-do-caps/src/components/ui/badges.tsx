import { STATUS_LABELS } from "@/domain/schedule";
import type { Match } from "@/domain/types";

export function LiveBadge({ label = "Ao vivo" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-live/15 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wider text-live">
      <span className="size-1.5 animate-pulse-live rounded-full bg-live" aria-hidden />
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: Match["status"] }) {
  if (status === "live") return <LiveBadge />;
  if (status === "halftime") return <LiveBadge label="Intervalo" />;
  const tone: Record<string, string> = {
    scheduled: "bg-surface-3 text-muted",
    finished: "bg-accent/10 text-accent",
    postponed: "bg-warning/15 text-warning",
    cancelled: "bg-danger/15 text-danger",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wider ${tone[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function CardIcon({ color, count, className = "" }: { color: "yellow" | "red"; count?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span
        aria-label={color === "yellow" ? "Cartão amarelo" : "Cartão vermelho"}
        role="img"
        className={`inline-block h-3.5 w-2.5 rounded-[2px] ${color === "yellow" ? "bg-card-yellow" : "bg-card-red"}`}
      />
      {count !== undefined ? <span className="tabular text-sm font-semibold">{count}</span> : null}
    </span>
  );
}

export function SuspendedBadge() {
  return (
    <span className="inline-flex rounded-md bg-danger px-2 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-wider text-white">
      Suspenso
    </span>
  );
}

export const POSITION_LABELS: Record<string, string> = {
  GOL: "Goleiro",
  ZAG: "Zagueiro",
  LAT: "Lateral",
  VOL: "Volante",
  MEI: "Meia",
  ATA: "Atacante",
};

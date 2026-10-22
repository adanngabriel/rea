import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`card pitch-lines flex flex-col items-center text-center ${compact ? "gap-2 px-5 py-8" : "gap-3 px-6 py-14"}`}
    >
      <span className="grid size-12 place-items-center rounded-full border border-line-strong bg-surface-2 text-accent">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="font-display text-xl font-bold uppercase tracking-wide">{title}</p>
      {children ? <div className="max-w-sm text-sm text-muted">{children}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

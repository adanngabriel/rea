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
    <div className={`rounded-2xl border border-dashed border-line-strong text-center ${compact ? "px-5 py-6" : "px-6 py-10"}`}>
      <Icon className="mx-auto mb-2 size-5 text-subtle" aria-hidden />
      <p className="font-semibold">{title}</p>
      {children ? <div className="mx-auto mt-1 max-w-sm text-sm text-muted">{children}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

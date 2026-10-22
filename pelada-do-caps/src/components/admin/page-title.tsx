import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function AdminPageTitle({
  title,
  description,
  back,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 space-y-3">
      {back ? (
        <Link href={back.href} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold uppercase leading-none sm:text-4xl">{title}</h1>
          {description ? <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warning"; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${tone === "warning" ? "border-warning/40 bg-warning/10 text-warning" : "border-line-strong bg-surface-2 text-muted"}`}
    >
      {children}
    </div>
  );
}

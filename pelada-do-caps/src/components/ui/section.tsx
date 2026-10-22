import { ChevronRight } from "lucide-react";
import Link from "next/link";

export function SectionHeader({
  title,
  eyebrow,
  href,
  linkLabel = "Ver tudo",
  as: Heading = "h2",
}: {
  title: string;
  eyebrow?: string;
  href?: string;
  linkLabel?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="eyebrow mb-1">{eyebrow}</p> : null}
        <Heading className="font-display text-2xl font-extrabold uppercase leading-none sm:text-3xl">{title}</Heading>
      </div>
      {href ? (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-accent hover:underline">
          {linkLabel}
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

export function PageHeader({ title, eyebrow, children }: { title: string; eyebrow?: string; children?: React.ReactNode }) {
  return (
    <header className="border-b border-line bg-gradient-to-b from-surface to-bg">
      <div className="container-page py-8 sm:py-12">
        {eyebrow ? <p className="eyebrow mb-2 text-accent">{eyebrow}</p> : null}
        <h1 className="font-display text-4xl font-extrabold uppercase leading-[0.95] sm:text-6xl">{title}</h1>
        {children ? <div className="mt-3 max-w-2xl text-muted">{children}</div> : null}
      </div>
    </header>
  );
}

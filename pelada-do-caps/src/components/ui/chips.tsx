import Link from "next/link";

/** Filtros em pílulas que rolam lateralmente no celular. */
export function Chips({ items, label }: { items: { href: string; label: string; active: boolean }[]; label: string }) {
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2">
        {items.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              scroll={false}
              aria-current={i.active ? "page" : undefined}
              className="inline-flex min-h-9 items-center rounded-full border border-line px-4 text-sm font-medium text-muted transition-colors hover:text-ink aria-[current=page]:border-brand aria-[current=page]:bg-brand aria-[current=page]:text-white"
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

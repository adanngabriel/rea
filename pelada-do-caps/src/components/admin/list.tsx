import { ChevronRight } from "lucide-react";
import Link from "next/link";

/** Lista simples de registros do painel com link para edição. */
export function AdminList({ items, empty }: { items: { id: string; href: string; title: string; meta?: React.ReactNode; badge?: React.ReactNode }[]; empty: string }) {
  if (items.length === 0) return <p className="card p-6 text-sm text-muted">{empty}</p>;
  return (
    <ul className="card divide-y divide-line overflow-hidden">
      {items.map((i) => (
        <li key={i.id}>
          <Link href={i.href} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{i.title}</span>
              {i.meta ? <span className="block truncate text-xs text-muted">{i.meta}</span> : null}
            </span>
            {i.badge}
            <ChevronRight className="size-4 text-muted" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

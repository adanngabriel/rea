import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageTitle } from "@/components/admin/page-title";
import { requireAdminPage } from "@/lib/auth";
import { serverClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Histórico de alterações" };

interface Row {
  id: number;
  actor_email: string | null;
  action: string;
  summary: string;
  undone_at: string | null;
  created_at: string;
}

const PAGE = 50;
const AREAS: Record<string, string> = {
  "": "Tudo",
  "event.": "Súmula",
  "match.": "Jogos",
  "draft.": "Sorteio",
  "player.": "Jogadores",
  "team.": "Times",
  "suspension.": "Disciplina",
  "rules.": "Regras",
  "news.": "Notícias",
};

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ p?: string; area?: string }> }) {
  await requireAdminPage();
  const { p, area = "" } = await searchParams;
  const page = Math.max(0, Number(p) || 0);
  const db = await serverClient();
  let query = db.from("audit_logs").select("id, actor_email, action, summary, undone_at, created_at", { count: "exact" });
  if (area && area in AREAS) query = query.like("action", `${area}%`);
  const { data, count } = await query.order("created_at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
  const rows = (data ?? []) as Row[];
  const qs = (n: number) => `/admin/auditoria?p=${n}${area ? `&area=${encodeURIComponent(area)}` : ""}`;
  return (
    <>
      <AdminPageTitle title="Histórico de alterações" description="Tudo o que foi feito no painel, com data, hora e responsável — útil para localizar e corrigir erros." />
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Filtrar por área">
        {Object.entries(AREAS).map(([k, v]) => (
          <Link key={k} href={`/admin/auditoria${k ? `?area=${encodeURIComponent(k)}` : ""}`} aria-current={area === k ? "page" : undefined} className="rounded-full border border-line px-3 py-1.5 text-sm text-muted aria-[current=page]:border-accent aria-[current=page]:text-accent">
            {v}
          </Link>
        ))}
      </nav>
      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-muted">Nenhum registro.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-4">
                <span className="tabular w-40 shrink-0 text-sm text-muted">{formatDateTime(r.created_at)}</span>
                <span className={`flex-1 text-sm ${r.undone_at ? "text-muted line-through" : ""}`}>{r.summary}</span>
                <span className="text-xs text-subtle">{r.actor_email ?? ""}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4 flex justify-between text-sm">
        {page > 0 ? <Link href={qs(page - 1)} className="btn-secondary btn-sm">Mais recentes</Link> : <span />}
        {count && (page + 1) * PAGE < count ? <Link href={qs(page + 1)} className="btn-secondary btn-sm">Mais antigos</Link> : null}
      </div>
    </>
  );
}

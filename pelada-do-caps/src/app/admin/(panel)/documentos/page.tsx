import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminList } from "@/components/admin/list";
import { AdminPageTitle } from "@/components/admin/page-title";
import { DOCUMENT_CATEGORIES, type DocumentItem } from "@/lib/data/content";
import { adminRows } from "@/lib/data/admin";
import { formatCalendarDate } from "@/lib/format";

export const metadata: Metadata = { title: "Documentos" };

export default async function AdminDocumentsPage() {
  const docs = await adminRows<DocumentItem>("documents", [{ column: "published_on", ascending: false }]);
  return (
    <>
      <AdminPageTitle
        title="Documentos"
        description="Regulamento, editais, tabelas, súmulas e decisões oficiais (PDF ou link)."
        actions={
          <Link href="/admin/documentos/novo" className="btn-primary btn-sm">
            <Plus className="size-4" aria-hidden /> Novo documento
          </Link>
        }
      />
      <AdminList
        empty="Nenhum documento publicado."
        items={docs.map((d) => ({
          id: d.id,
          href: `/admin/documentos/${d.id}`,
          title: d.title,
          meta: `${DOCUMENT_CATEGORIES[d.category]} • ${formatCalendarDate(d.published_on)}`,
          badge: d.is_published ? null : <span className="rounded-full bg-surface-3 px-2.5 py-1 text-xs text-muted">Oculto</span>,
        }))}
      />
    </>
  );
}

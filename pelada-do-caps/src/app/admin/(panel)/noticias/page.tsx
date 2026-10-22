import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminList } from "@/components/admin/list";
import { AdminPageTitle } from "@/components/admin/page-title";
import { NEWS_CATEGORIES, type NewsItem } from "@/lib/data/content";
import { adminRows } from "@/lib/data/admin";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Notícias" };

export default async function AdminNewsPage() {
  const news = await adminRows<NewsItem>("news", [{ column: "published_at", ascending: false }]);
  return (
    <>
      <AdminPageTitle
        title="Notícias e comunicados"
        actions={
          <Link href="/admin/noticias/novo" className="btn-primary btn-sm">
            <Plus className="size-4" aria-hidden /> Nova publicação
          </Link>
        }
      />
      <AdminList
        empty="Nenhuma publicação ainda."
        items={news.map((n) => ({
          id: n.id,
          href: `/admin/noticias/${n.id}`,
          title: n.title,
          meta: `${NEWS_CATEGORIES[n.category]} • ${formatDateTime(n.published_at)}`,
          badge:
            n.status === "published" ? (
              <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-bold text-accent">Publicada</span>
            ) : (
              <span className="rounded-full bg-surface-3 px-2.5 py-1 text-xs font-bold text-muted">Rascunho</span>
            ),
        }))}
      />
    </>
  );
}

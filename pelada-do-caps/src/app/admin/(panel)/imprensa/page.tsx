import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminList } from "@/components/admin/list";
import { AdminPageTitle } from "@/components/admin/page-title";
import type { PressLink } from "@/lib/data/content";
import { adminRows } from "@/lib/data/admin";
import { formatCalendarDate } from "@/lib/format";

export const metadata: Metadata = { title: "Na mídia" };

export default async function AdminPressPage() {
  const links = await adminRows<PressLink>("press_links", [{ column: "published_on", ascending: false }]);
  return (
    <>
      <AdminPageTitle
        title="Na mídia"
        description="Matérias de jornais, blogs e perfis sobre o torneio. O visitante é levado ao site original."
        actions={
          <Link href="/admin/imprensa/novo" className="btn-primary btn-sm">
            <Plus className="size-4" aria-hidden /> Nova matéria
          </Link>
        }
      />
      <AdminList
        empty="Nenhuma matéria cadastrada."
        items={links.map((l) => ({ id: l.id, href: `/admin/imprensa/${l.id}`, title: l.title, meta: [l.outlet, l.published_on ? formatCalendarDate(l.published_on) : null].filter(Boolean).join(" • ") }))}
      />
    </>
  );
}

import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminList } from "@/components/admin/list";
import { AdminPageTitle } from "@/components/admin/page-title";
import { GALLERY_CATEGORIES, type GalleryAlbum } from "@/lib/data/content";
import { adminRows } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Galeria" };

export default async function AdminGalleryPage() {
  const albums = await adminRows<GalleryAlbum>("gallery_albums", [{ column: "sort_order" }, { column: "created_at", ascending: false }]);
  return (
    <>
      <AdminPageTitle
        title="Galeria"
        description="Organize fotos e vídeos em álbuns (Sorteio, rodadas, final, premiação...)."
        actions={
          <Link href="/admin/galeria/novo" className="btn-primary btn-sm">
            <Plus className="size-4" aria-hidden /> Novo álbum
          </Link>
        }
      />
      <AdminList
        empty="Nenhum álbum criado."
        items={albums.map((a) => ({
          id: a.id,
          href: `/admin/galeria/${a.id}`,
          title: a.title,
          meta: GALLERY_CATEGORIES[a.category],
          badge: a.is_published ? null : <span className="rounded-full bg-surface-3 px-2.5 py-1 text-xs text-muted">Oculto</span>,
        }))}
      />
    </>
  );
}

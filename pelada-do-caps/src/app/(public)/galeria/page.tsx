import { Images } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/section";
import { GALLERY_CATEGORIES, getAlbums } from "@/lib/data/content";
import { formatCalendarDate } from "@/lib/format";

export const revalidate = 300;
export const metadata: Metadata = { title: "Galeria", description: "Fotos e vídeos do torneio." };

export default async function GalleryPage() {
  const albums = await getAlbums();
  return (
    <>
      <PageHeader title="Galeria" eyebrow="Fotos e vídeos" />
      <div className="container-page py-8">
        {albums.length === 0 ? (
          <EmptyState icon={Images} title="Em breve">
            As fotos do sorteio, das rodadas e da premiação aparecerão aqui.
          </EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((a) => (
              <li key={a.id}>
                <Link href={`/galeria/${a.id}`} className="card card-hover group block overflow-hidden">
                  <div className="relative aspect-[4/3] bg-surface-2">
                    {a.cover_url ? (
                      <Image src={a.cover_url} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-300 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="pitch-lines grid h-full place-items-center">
                        <Images className="size-8 text-line-strong" aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="eyebrow text-accent">
                      {GALLERY_CATEGORIES[a.category]}
                      {a.event_date ? ` • ${formatCalendarDate(a.event_date)}` : ""}
                    </p>
                    <h2 className="mt-1 font-display text-xl font-bold uppercase">{a.title}</h2>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

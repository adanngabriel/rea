import { ArrowLeft, ExternalLink, PlayCircle } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShareButton } from "@/components/public/share-button";
import { GALLERY_CATEGORIES, getAlbum } from "@/lib/data/content";
import { youtubeEmbed } from "@/lib/video";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const data = await getAlbum((await params).id);
  if (!data) return { title: "Álbum não encontrado" };
  return { title: data.album.title, description: data.album.description ?? undefined, openGraph: data.album.cover_url ? { images: [data.album.cover_url] } : undefined };
}

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const data = await getAlbum((await params).id);
  if (!data) notFound();
  const { album, items } = data;
  return (
    <div className="container-page space-y-6 py-8">
      <Link href="/galeria" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Galeria
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-accent">{GALLERY_CATEGORIES[album.category]}</p>
          <h1 className="font-display text-4xl font-extrabold uppercase sm:text-5xl">{album.title}</h1>
          {album.description ? <p className="mt-2 max-w-2xl text-muted">{album.description}</p> : null}
        </div>
        <ShareButton title={album.title} path={`/galeria/${album.id}`} />
      </div>
      {items.length === 0 ? (
        <p className="text-muted">Nenhuma foto neste álbum ainda.</p>
      ) : (
        <ul className="columns-2 gap-3 sm:columns-3 lg:columns-4">
          {items.map((item) => {
            const embed = item.kind === "video" ? youtubeEmbed(item.url) : null;
            return (
              <li key={item.id} className="mb-3 break-inside-avoid">
                <figure className="card overflow-hidden">
                  {item.kind === "photo" ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      <Image src={item.url} alt={item.caption ?? `Foto do álbum ${album.title}`} width={600} height={450} sizes="(min-width: 1024px) 25vw, 50vw" className="h-auto w-full" />
                    </a>
                  ) : embed ? (
                    <iframe src={embed} title={item.caption ?? "Vídeo"} loading="lazy" allow="encrypted-media; picture-in-picture" allowFullScreen className="aspect-video w-full" />
                  ) : (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex aspect-video items-center justify-center gap-2 bg-surface-2 text-sm text-accent">
                      <PlayCircle className="size-6" aria-hidden /> Assistir vídeo <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  )}
                  {item.caption ? <figcaption className="px-3 py-2 text-xs text-muted">{item.caption}</figcaption> : null}
                </figure>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

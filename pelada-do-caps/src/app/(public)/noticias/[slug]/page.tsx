import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShareButton } from "@/components/public/share-button";
import { getNewsBySlug, NEWS_CATEGORIES } from "@/lib/data/content";
import { formatDate, formatTime } from "@/lib/format";
import { Markdown } from "@/lib/markdown";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const item = await getNewsBySlug((await params).slug);
  if (!item) return { title: "Notícia não encontrada" };
  return {
    title: item.title,
    description: item.subtitle ?? item.body.slice(0, 160),
    openGraph: {
      type: "article",
      title: item.title,
      description: item.subtitle ?? undefined,
      publishedTime: item.published_at,
      images: item.cover_url ? [item.cover_url] : undefined,
    },
  };
}

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const item = await getNewsBySlug((await params).slug);
  if (!item) notFound();
  return (
    <article>
      <header className="border-b border-line">
        <div className="container-page max-w-3xl py-8 sm:py-12">
          <Link href="/noticias" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden /> Notícias
          </Link>
          <p className="eyebrow mb-3 text-accent">{NEWS_CATEGORIES[item.category]}</p>
          <h1 className="font-display text-4xl font-extrabold uppercase leading-[0.95] sm:text-6xl">{item.title}</h1>
          {item.subtitle ? <p className="mt-4 text-lg text-muted">{item.subtitle}</p> : null}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <p>
              {item.author ? <>Por <strong className="text-ink">{item.author}</strong> • </> : null}
              <time dateTime={item.published_at}>
                {formatDate(item.published_at)} às {formatTime(item.published_at)}
              </time>
            </p>
            <ShareButton title={item.title} text={item.subtitle ?? undefined} path={`/noticias/${item.slug}`} />
          </div>
        </div>
      </header>
      <div className="container-page max-w-3xl space-y-8 py-8">
        {item.cover_url ? (
          <div className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-card)]">
            <Image src={item.cover_url} alt="" fill priority sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
          </div>
        ) : null}
        <Markdown source={item.body} />
        {item.cta_url && item.cta_label ? (
          <a href={item.cta_url} className="btn-primary" target={/^https?:/.test(item.cta_url) ? "_blank" : undefined} rel="noopener noreferrer">
            {item.cta_label}
          </a>
        ) : null}
        {item.external_url ? (
          <a href={item.external_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-accent underline underline-offset-4">
            Ler matéria completa <ExternalLink className="size-4" aria-hidden />
          </a>
        ) : null}
      </div>
    </article>
  );
}

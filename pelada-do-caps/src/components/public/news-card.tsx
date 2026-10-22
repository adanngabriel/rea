import { Newspaper } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { NEWS_CATEGORIES, type NewsItem } from "@/lib/data/content";
import { formatDate } from "@/lib/format";

export function NewsCard({ item, large = false }: { item: NewsItem; large?: boolean }) {
  return (
    <Link href={`/noticias/${item.slug}`} className="card card-hover group flex flex-col overflow-hidden">
      <div className={`relative ${large ? "aspect-[16/9]" : "aspect-[16/10]"} bg-surface-2`}>
        {item.cover_url ? (
          <Image
            src={item.cover_url}
            alt=""
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="pitch-lines grid h-full place-items-center">
            <Newspaper className="size-8 text-line-strong" aria-hidden />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-bg/80 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-accent backdrop-blur">
          {NEWS_CATEGORIES[item.category]}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <time dateTime={item.published_at} className="text-xs text-muted">
          {formatDate(item.published_at)}
        </time>
        <h3 className={`font-display font-bold uppercase leading-tight ${large ? "text-3xl" : "text-xl"}`}>{item.title}</h3>
        {item.subtitle ? <p className="line-clamp-2 text-sm text-muted">{item.subtitle}</p> : null}
      </div>
    </Link>
  );
}

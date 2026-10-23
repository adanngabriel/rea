import { ExternalLink, Newspaper } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/section";
import { getPressLinks } from "@/lib/data/content";
import { formatCalendarDate } from "@/lib/format";

export const revalidate = 300;
export const metadata: Metadata = { title: "Na mídia", description: "Matérias e reportagens sobre o torneio." };

export default async function PressPage() {
  const links = await getPressLinks();
  return (
    <>
      <PageHeader title="Na mídia" />
      <div className="container-page py-8">
        {links.length === 0 ? (
          <EmptyState icon={Newspaper} title="Nenhuma matéria ainda">
            Reportagens sobre o torneio aparecerão aqui.
          </EmptyState>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {links.map((l) => (
              <li key={l.id}>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="card card-hover flex h-full flex-col overflow-hidden">
                  <div className="relative aspect-[16/9] bg-surface-2">
                    {l.image_url ? (
                      <Image src={l.image_url} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
                    ) : (
                      <div className="pitch-lines grid h-full place-items-center">
                        <Newspaper className="size-8 text-line-strong" aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <p className="eyebrow text-accent">
                      {l.outlet ?? "Matéria"}
                      {l.published_on ? ` • ${formatCalendarDate(l.published_on)}` : ""}
                    </p>
                    <h2 className="font-display text-xl font-bold uppercase leading-tight">{l.title}</h2>
                    {l.summary ? <p className="line-clamp-3 text-sm text-muted">{l.summary}</p> : null}
                    <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold text-accent">
                      Ler no site original <ExternalLink className="size-3.5" aria-hidden />
                    </span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

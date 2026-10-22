import { CalendarDays, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { ShareButton } from "@/components/public/share-button";
import { PageHeader } from "@/components/ui/section";
import { getSiteSettings } from "@/lib/data/content";
import { currentSnapshot } from "@/lib/data/require";
import { formatCalendarDate } from "@/lib/format";
import { Markdown } from "@/lib/markdown";
import { qrSvg } from "@/lib/qr";
import { siteUrl } from "@/lib/supabase/env";

export const revalidate = 300;
export const metadata: Metadata = { title: "Sobre o torneio", description: "Conheça o Torneio da Pelada do Caps." };

export default async function AboutPage() {
  const [s, site] = await Promise.all([currentSnapshot(), getSiteSettings()]);
  const url = site.site_url || siteUrl();
  const qr = await qrSvg(url);
  const { edition } = s;
  const mapsUrl = edition.venue
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([edition.venue, edition.venue_address].filter(Boolean).join(", "))}`
    : null;
  return (
    <>
      <PageHeader title="Sobre o torneio" eyebrow={edition.name}>
        {edition.description}
      </PageHeader>
      <div className="container-page grid grid-cols-1 gap-8 py-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {edition.about ? <Markdown source={edition.about} /> : <p className="text-muted">Mais informações sobre o torneio serão publicadas em breve.</p>}
          <section aria-labelledby="h-calendario">
            <h2 id="h-calendario" className="mb-3 font-display text-2xl font-extrabold uppercase">
              Calendário
            </h2>
            <ul className="card divide-y divide-line">
              {s.rounds.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <CalendarDays className="size-4 text-accent" aria-hidden />
                  <span className="flex-1 font-semibold">{r.name}</span>
                  <span className="tabular text-muted">{r.scheduled_on ? formatCalendarDate(r.scheduled_on) : "A definir"}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <aside className="space-y-4">
          {edition.venue ? (
            <div className="card p-5">
              <p className="eyebrow mb-2">Local</p>
              <p className="flex items-start gap-2 font-semibold">
                <MapPin className="mt-0.5 size-4 text-accent" aria-hidden />
                <span>
                  {edition.venue}
                  {edition.venue_address ? <span className="block text-sm font-normal text-muted">{edition.venue_address}</span> : null}
                </span>
              </p>
              {mapsUrl ? (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm mt-4">
                  Abrir no mapa
                </a>
              ) : null}
            </div>
          ) : null}
          <div className="card flex flex-col items-center gap-3 p-5 text-center">
            <p className="eyebrow">Acesse pelo celular</p>
            <div className="w-44 rounded-xl bg-white p-2" role="img" aria-label={`QR Code para ${url}`} dangerouslySetInnerHTML={{ __html: qr }} />
            <p className="break-all text-sm text-muted">{url.replace(/^https?:\/\//, "")}</p>
            <ShareButton title={edition.name} path="/" className="btn-primary btn-sm" />
          </div>
          {site.contact_email ? (
            <p className="text-sm text-muted">
              Contato: <a className="text-accent underline" href={`mailto:${site.contact_email}`}>{site.contact_email}</a>
            </p>
          ) : null}
        </aside>
      </div>
    </>
  );
}

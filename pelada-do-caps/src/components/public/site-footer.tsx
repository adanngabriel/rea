import { Camera, Lock, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SPONSOR_TIERS, type SiteSettings, type Sponsor } from "@/lib/data/content";
import { NAV_GROUPS } from "./nav-items";

export function SiteFooter({ site, sponsors, editionName }: { site: SiteSettings; sponsors: Sponsor[]; editionName: string }) {
  return (
    <footer className="mt-12 border-t border-line bg-surface pb-24 lg:pb-0">
      {sponsors.length > 0 ? (
        <section aria-labelledby="apoio" className="border-b border-line">
          <div className="container-page py-8">
            <h2 id="apoio" className="eyebrow mb-4 text-center">
              Patrocinadores e apoiadores
            </h2>
            <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
              {sponsors.map((s) => {
                const content = s.logo_url ? (
                  <Image src={s.logo_url} alt={s.name} width={140} height={56} className="h-12 w-auto object-contain opacity-80 transition hover:opacity-100" />
                ) : (
                  <span className="font-display text-xl font-bold uppercase text-muted">{s.name}</span>
                );
                return (
                  <li key={s.id} title={`${SPONSOR_TIERS[s.tier]} — ${s.name}`}>
                    {s.website_url ? (
                      <a href={s.website_url} target="_blank" rel="noopener noreferrer">
                        {content}
                      </a>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}
      <div className="container-page grid gap-8 py-6 sm:grid-cols-[1.2fr_repeat(3,1fr)] sm:py-10">
        <div>
          <p className="font-display text-lg font-bold uppercase">{editionName}</p>
          {site.tagline ? <p className="mt-1 text-sm text-muted">{site.tagline}</p> : null}
          {site.instagram_url || site.whatsapp_url ? (
            <div className="mt-4 flex gap-2">
              {site.instagram_url ? (
                <a href={site.instagram_url} className="btn-secondary btn-sm" target="_blank" rel="noopener noreferrer">
                  <Camera className="size-4" aria-hidden /> Instagram
                </a>
              ) : null}
              {site.whatsapp_url ? (
                <a href={site.whatsapp_url} className="btn-secondary btn-sm" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-4" aria-hidden /> WhatsApp
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
        {NAV_GROUPS.map((group) => (
          <nav key={group.title} aria-label={`Rodapé — ${group.title}`} className="hidden sm:block">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-subtle">{group.title}</p>
            <ul className="space-y-2 text-sm text-muted">
              {group.items.map((i) => (
                <li key={i.href}>
                  <Link href={i.href} className="hover:text-ink">
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-5 text-xs text-subtle">
          <p>© {editionName}. Todos os direitos reservados.</p>
          <Link href="/admin" className="inline-flex min-h-10 items-center gap-1.5 hover:text-muted" rel="nofollow">
            <Lock className="size-3" aria-hidden /> Área da organização
          </Link>
        </div>
      </div>
    </footer>
  );
}

import { Brand } from "@/components/public/brand";
import { SetupNotice } from "@/components/public/setup-notice";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { getSiteSettings, getSponsors } from "@/lib/data/content";
import { getPublicSnapshot } from "@/lib/data/tournament";
import { supabaseEnv } from "@/lib/supabase/env";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  if (!supabaseEnv()) {
    return <SetupNotice reason="env" />;
  }
  const [site, sponsors, snapshot] = await Promise.all([getSiteSettings(), getSponsors(), getPublicSnapshot()]);
  const brand = (
    <Brand
      name={snapshot?.edition.name ?? site.site_name}
      tagline={site.tagline}
      logoUrl={snapshot?.edition.logo_url}
    />
  );
  return (
    <>
      <SiteHeader brand={brand} />
      {snapshot ? (
        <main id="conteudo" className="min-h-[60vh]">
          {children}
        </main>
      ) : (
        <SetupNotice reason="edition" />
      )}
      <SiteFooter site={site} sponsors={sponsors} editionName={snapshot?.edition.name ?? site.site_name} />
    </>
  );
}

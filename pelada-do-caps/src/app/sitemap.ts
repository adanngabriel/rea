import type { MetadataRoute } from "next";
import { getNews } from "@/lib/data/content";
import { getPublicSnapshot } from "@/lib/data/tournament";
import { siteUrl } from "@/lib/supabase/env";
import { supabaseEnv } from "@/lib/supabase/env";

export const revalidate = 3600;

const STATIC = ["", "/jogos", "/classificacao", "/times", "/jogadores", "/estatisticas", "/mata-mata", "/cartoes", "/sorteio", "/noticias", "/documentos", "/galeria", "/na-midia", "/campeao", "/campeoes", "/sobre"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const out: MetadataRoute.Sitemap = STATIC.map((p) => ({ url: `${base}${p}` }));
  if (!supabaseEnv()) return out;
  const [s, news] = await Promise.all([getPublicSnapshot().catch(() => null), getNews(200).catch(() => [])]);
  if (s) {
    out.push(...s.teams.map((t) => ({ url: `${base}/times/${t.slug}` })));
    out.push(...s.matches.map((m) => ({ url: `${base}/jogos/${m.id}` })));
  }
  out.push(...news.map((n) => ({ url: `${base}/noticias/${n.slug}`, lastModified: n.published_at })));
  return out;
}

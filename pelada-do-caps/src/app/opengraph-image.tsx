import { siteOgCard } from "@/lib/cards/cards";
import { getSiteSettings } from "@/lib/data/content";
import { getPublicSnapshot } from "@/lib/data/tournament";
import { supabaseEnv } from "@/lib/supabase/env";

export const alt = "Torneio da Pelada do Caps";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image() {
  if (!supabaseEnv()) return siteOgCard(null);
  const [s, site] = await Promise.all([getPublicSnapshot().catch(() => null), getSiteSettings().catch(() => null)]);
  return siteOgCard(s, site?.og_image_url);
}

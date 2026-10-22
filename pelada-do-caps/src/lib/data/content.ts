import "server-only";
import { cache } from "react";
import { publicClient } from "../supabase/public";
import { DataError } from "./tournament";

export interface SiteSettings {
  site_name: string;
  tagline: string | null;
  site_url: string | null;
  instagram_url: string | null;
  whatsapp_url: string | null;
  contact_email: string | null;
  og_image_url: string | null;
}

export const NEWS_CATEGORIES = {
  noticia: "Notícia",
  comunicado: "Comunicado",
  organizacao: "Organização",
  resultado: "Resultado",
  sorteio: "Sorteio",
} as const;
export type NewsCategory = keyof typeof NEWS_CATEGORIES;

export interface NewsItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  cover_url: string | null;
  body: string;
  category: NewsCategory;
  author: string | null;
  status: "draft" | "published";
  published_at: string;
  external_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
}

export const DOCUMENT_CATEGORIES = {
  regulamento: "Regulamento",
  edital: "Edital",
  comunicado: "Comunicado oficial",
  tabela: "Tabela",
  sumula: "Súmula",
  disciplinar: "Decisão disciplinar",
  outro: "Outro",
} as const;
export type DocumentCategory = keyof typeof DOCUMENT_CATEGORIES;

export interface DocumentItem {
  id: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  file_url: string | null;
  external_url: string | null;
  published_on: string;
  is_published: boolean;
}

export interface PressLink {
  id: string;
  title: string;
  outlet: string | null;
  image_url: string | null;
  summary: string | null;
  url: string;
  published_on: string | null;
}

export const GALLERY_CATEGORIES = {
  sorteio: "Sorteio",
  "rodada-1": "1ª Rodada",
  "rodada-2": "2ª Rodada",
  "rodada-3": "3ª Rodada",
  final: "Final",
  premiacao: "Premiação",
  bastidores: "Bastidores",
  outro: "Outros",
} as const;
export type GalleryCategory = keyof typeof GALLERY_CATEGORIES;

export interface GalleryAlbum {
  id: string;
  title: string;
  description: string | null;
  category: GalleryCategory;
  cover_url: string | null;
  event_date: string | null;
  is_published: boolean;
  sort_order: number;
}

export interface GalleryItem {
  id: string;
  album_id: string;
  kind: "photo" | "video";
  url: string;
  caption: string | null;
  sort_order: number;
}

export const SPONSOR_TIERS = { master: "Master", patrocinio: "Patrocínio", apoio: "Apoio" } as const;

export interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  tier: keyof typeof SPONSOR_TIERS;
  sort_order: number;
  active: boolean;
}

function check<T>(what: string, result: { data: unknown; error: { message: string } | null }): T {
  if (result.error) throw new DataError(what, result.error);
  return result.data as T;
}

export const DEFAULT_SITE: SiteSettings = {
  site_name: "Torneio da Pelada do Caps",
  tagline: "Inter Academy • 2026",
  site_url: null,
  instagram_url: null,
  whatsapp_url: null,
  contact_email: null,
  og_image_url: null,
};

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const data = check<SiteSettings | null>(
    "configurações",
    await publicClient().from("site_settings").select("*").eq("id", 1).maybeSingle(),
  );
  return data ?? DEFAULT_SITE;
});

export const getNews = cache(async (limit = 50): Promise<NewsItem[]> =>
  check("notícias", await publicClient().from("news").select("*").order("published_at", { ascending: false }).limit(limit)),
);

export const getNewsBySlug = cache(async (slug: string): Promise<NewsItem | null> =>
  check("notícia", await publicClient().from("news").select("*").eq("slug", slug).maybeSingle()),
);

export const getDocuments = cache(async (): Promise<DocumentItem[]> =>
  check("documentos", await publicClient().from("documents").select("*").order("published_on", { ascending: false })),
);

export const getPressLinks = cache(async (): Promise<PressLink[]> =>
  check(
    "matérias",
    await publicClient().from("press_links").select("*").order("published_on", { ascending: false, nullsFirst: false }),
  ),
);

export const getAlbums = cache(async (): Promise<GalleryAlbum[]> =>
  check(
    "álbuns",
    await publicClient()
      .from("gallery_albums")
      .select("*")
      .order("sort_order")
      .order("event_date", { ascending: false, nullsFirst: false }),
  ),
);

export const getAlbum = cache(async (id: string): Promise<{ album: GalleryAlbum; items: GalleryItem[] } | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const client = publicClient();
  const album = check<GalleryAlbum | null>("álbum", await client.from("gallery_albums").select("*").eq("id", id).maybeSingle());
  if (!album) return null;
  const items = check<GalleryItem[]>(
    "fotos",
    await client.from("gallery_items").select("*").eq("album_id", id).order("sort_order").order("created_at"),
  );
  return { album, items };
});

export const getSponsors = cache(async (): Promise<Sponsor[]> =>
  check("apoiadores", await publicClient().from("sponsors").select("*").order("sort_order").order("name")),
);

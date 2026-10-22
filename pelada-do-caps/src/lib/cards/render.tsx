import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import type { Team } from "@/domain/types";

// Imagens de compartilhamento (Instagram/WhatsApp) geradas no servidor a
// partir dos dados atuais. Satori exige display:flex em todo elemento com
// mais de um filho e só entende PNG/JPEG/GIF.

export const FORMATS = {
  feed: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
  og: { width: 1200, height: 630 },
} as const;
export type CardFormat = keyof typeof FORMATS;

export const C = {
  bg: "#070b09",
  surface: "#0e1411",
  surface2: "#141c18",
  line: "#233029",
  ink: "#eef4f0",
  muted: "#9aaba1",
  accent: "#b9f53d",
  gold: "#f5c84b",
};

let fonts: Promise<{ name: string; data: Buffer; weight: 600 | 800; style: "normal" }[]> | null = null;
function loadFonts() {
  fonts ??= Promise.all(
    ([600, 800] as const).map(async (weight) => ({
      name: "Barlow Condensed",
      weight,
      style: "normal" as const,
      data: await readFile(join(process.cwd(), "src/assets/fonts", `barlow-condensed-latin-${weight}-normal.woff`)),
    })),
  );
  return fonts;
}

const imageCache = new Map<string, Promise<string | null>>();
/** Baixa a imagem e devolve data URI, apenas em formatos suportados. */
export function embedImage(url: string | null | undefined): Promise<string | null> {
  if (!url) return Promise.resolve(null);
  let cached = imageCache.get(url);
  if (!cached) {
    cached = fetch(url, { next: { revalidate: 3600 } } as RequestInit)
      .then(async (res) => {
        const type = res.headers.get("content-type") ?? "";
        if (!res.ok || !/^image\/(png|jpe?g|gif)/.test(type)) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 3_000_000) return null;
        return `data:${type};base64,${buf.toString("base64")}`;
      })
      .catch(() => null);
    imageCache.set(url, cached);
    if (imageCache.size > 200) imageCache.delete(imageCache.keys().next().value!);
  }
  return cached;
}

export async function crestMap(teams: readonly Team[]): Promise<Map<string, string | null>> {
  const entries = await Promise.all(teams.map(async (t) => [t.id, await embedImage(t.crest_url)] as const));
  return new Map(entries);
}

export function CrestBox({ team, src, size }: { team: Pick<Team, "name" | "short_name" | "primary_color" | "secondary_color"> | null; src: string | null | undefined; size: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} width={size} height={size} style={{ objectFit: "contain" }} alt="" />;
  }
  const label = team ? (team.short_name ?? team.name.slice(0, 3)).toUpperCase() : "?";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        background: team?.primary_color ?? C.line,
        border: `${Math.max(2, size / 20)}px solid ${team?.secondary_color ?? C.muted}`,
        color: team?.secondary_color ?? C.ink,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.34,
        fontWeight: 800,
      }}
    >
      {label}
    </div>
  );
}

/** Moldura comum: cabeçalho com o torneio, título, conteúdo e rodapé. */
export function Frame({ format, eyebrow, title, children, footer }: { format: CardFormat; eyebrow: string; title: string; children: ReactNode; footer: string }) {
  const { width, height } = FORMATS[format];
  const pad = format === "og" ? 56 : 72;
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        background: `radial-gradient(circle at 15% 0%, #1d3a12 0%, ${C.bg} 55%)`,
        color: C.ink,
        fontFamily: "Barlow Condensed",
        padding: pad,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: format === "og" ? 26 : 32, color: C.accent, fontWeight: 600, letterSpacing: 4, textTransform: "uppercase" }}>{eyebrow}</div>
        <div style={{ display: "flex", fontSize: format === "og" ? 72 : format === "story" ? 110 : 96, fontWeight: 800, lineHeight: 0.95, textTransform: "uppercase", marginTop: 8 }}>{title}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, marginTop: format === "og" ? 24 : 48, justifyContent: format === "story" ? "center" : "flex-start" }}>{children}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 28, color: C.muted, borderTop: `2px solid ${C.line}`, paddingTop: 20 }}>
        <span>{footer}</span>
        <div style={{ display: "flex", width: 18, height: 18, borderRadius: 9, background: C.accent }} />
      </div>
    </div>
  );
}

export async function renderCard(node: ReactNode, format: CardFormat, cacheSeconds = 60): Promise<ImageResponse> {
  const { width, height } = FORMATS[format];
  return new ImageResponse(node as React.ReactElement, {
    width,
    height,
    fonts: await loadFonts(),
    headers: { "Cache-Control": `public, max-age=0, s-maxage=${cacheSeconds}, stale-while-revalidate=300` },
  });
}

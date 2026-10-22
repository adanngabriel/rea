import "@fontsource-variable/inter";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { siteUrl } from "@/lib/supabase/env";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "1º Torneio da Pelada do Caps", template: "%s • Pelada do Caps" },
  description: "Portal oficial do 1º Torneio da Pelada do Caps — Inter Academy, 02 a 19/11/2026. Jogos, classificação, artilharia e mais.",
  applicationName: "Pelada do Caps",
  openGraph: { type: "website", locale: "pt_BR", siteName: "Torneio da Pelada do Caps" },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#050913",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

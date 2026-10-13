import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AG VPN — Navegue com privacidade",
  description:
    "AG VPN protege sua conexão com criptografia forte, servidores em vários países e um clique para conectar.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#5b21b6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

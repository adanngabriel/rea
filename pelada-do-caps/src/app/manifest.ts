import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Torneio da Pelada do Caps",
    short_name: "Pelada do Caps",
    description: "Jogos, classificação e artilharia do Torneio da Pelada do Caps.",
    start_url: "/",
    display: "standalone",
    background_color: "#050913",
    theme_color: "#050913",
    lang: "pt-BR",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}

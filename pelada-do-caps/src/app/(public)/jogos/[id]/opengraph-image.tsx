import { matchOgCard, siteOgCard } from "@/lib/cards/cards";
import { getPublicSnapshot } from "@/lib/data/tournament";

export const alt = "Partida do Torneio da Pelada do Caps";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getPublicSnapshot();
  const match = s?.matches.find((m) => m.id === id);
  return match && s ? matchOgCard(s, match) : siteOgCard(s);
}

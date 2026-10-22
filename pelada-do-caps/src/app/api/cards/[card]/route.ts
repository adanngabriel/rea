import { roundCard, scorersCard, standingsCard } from "@/lib/cards/cards";
import type { CardFormat } from "@/lib/cards/render";
import { getPublicSnapshot } from "@/lib/data/tournament";

/** Imagens prontas para Instagram/WhatsApp: /api/cards/classificacao?formato=story */
export async function GET(request: Request, { params }: { params: Promise<{ card: string }> }) {
  const { card } = await params;
  const url = new URL(request.url);
  const format: CardFormat = url.searchParams.get("formato") === "story" ? "story" : "feed";
  const roundId = url.searchParams.get("rodada");
  const s = await getPublicSnapshot();
  if (!s) return new Response("Nenhuma edição ativa", { status: 404 });
  switch (card) {
    case "classificacao":
      return standingsCard(s, format);
    case "confrontos":
      return roundCard(s, roundId, "fixtures", format);
    case "resultados":
      return roundCard(s, roundId, "results", format);
    case "artilharia":
      return scorersCard(s, format);
    default:
      return new Response("Card desconhecido", { status: 404 });
  }
}

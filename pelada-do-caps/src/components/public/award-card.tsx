import { Medal } from "lucide-react";
import Image from "next/image";
import { PlayerAvatar } from "@/components/ui/avatar";
import { Crest } from "@/components/ui/crest";
import { displayName, type indexSnapshot } from "@/domain/snapshot";
import type { Award, AwardCategory } from "@/domain/types";

/** Ordem de exibição dos prêmios do torneio (destaques de rodada ficam em /estatisticas). */
const PRIZE_ORDER: AwardCategory[] = ["champion", "runner_up", "third_place", "top_scorer", "best_player", "best_goalkeeper", "other"];

export function tournamentPrizes(awards: Award[], exclude: AwardCategory[] = []): Award[] {
  return awards
    .filter((a) => PRIZE_ORDER.includes(a.category) && !exclude.includes(a.category))
    .sort((a, b) => PRIZE_ORDER.indexOf(a.category) - PRIZE_ORDER.indexOf(b.category) || a.sort_order - b.sort_order);
}

/** Um prêmio: o que se ganha (com a foto) e, quando já se sabe, quem ganhou. */
export function AwardCard({ award: a, ix }: { award: Award; ix: ReturnType<typeof indexSnapshot> }) {
  const p = ix.player(a.player_id);
  const t = ix.team(a.team_id);
  return (
    <article className="card overflow-hidden">
      {a.image_url ? (
        <a href={a.image_url} target="_blank" rel="noopener" className="relative block aspect-[4/3] bg-surface-2" aria-label={`Ver foto de ${a.title} em tamanho real`}>
          <Image src={a.image_url} alt={a.title} fill sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 90vw" className="object-cover" />
        </a>
      ) : null}
      <div className="flex items-center gap-3 p-4">
        {p ? <PlayerAvatar player={p} size={52} /> : t ? <Crest team={t} size={52} /> : <Medal className="size-10 shrink-0 text-gold" aria-hidden />}
        <div className="min-w-0">
          <h3 className="eyebrow text-gold">{a.title}</h3>
          <p className="truncate font-semibold">{p ? displayName(p) : (t?.name ?? <span className="text-muted">Vencedor a definir</span>)}</p>
          {a.description ? <p className="mt-0.5 text-sm text-muted">{a.description}</p> : null}
        </div>
      </div>
    </article>
  );
}

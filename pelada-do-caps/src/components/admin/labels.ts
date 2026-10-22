import type { AwardCategory } from "@/domain/types";

export const AWARD_LABELS: Record<AwardCategory, string> = {
  champion: "Campeão",
  runner_up: "Vice-campeão",
  third_place: "Terceiro lugar",
  top_scorer: "Artilheiro",
  best_player: "Craque do torneio",
  best_goalkeeper: "Melhor goleiro",
  round_highlight: "Destaque da rodada",
  other: "Outro prêmio",
};

import { Users } from "lucide-react";
import type { Metadata } from "next";
import { PlayerDirectory } from "@/components/public/player-directory";
import { PlayerAvatar } from "@/components/ui/avatar";
import { POSITION_LABELS } from "@/components/ui/badges";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/section";
import { rosterEntries } from "@/domain/snapshot";
import { computePlayerStats } from "@/domain/stats";
import { currentSnapshot } from "@/lib/data/require";

export const revalidate = 60;
export const metadata: Metadata = { title: "Jogadores", description: "Todos os atletas inscritos no torneio." };

export default async function PlayersPage() {
  const s = await currentSnapshot();
  const stats = computePlayerStats(s);
  const entries = rosterEntries(s).filter((e) => e.player.active);
  return (
    <>
      <PageHeader title="Jogadores" eyebrow={s.edition.name} />
      <div className="container-page py-8">
        {entries.length === 0 ? (
          <EmptyState icon={Users} title="Inscrições em andamento">
            A lista de jogadores será publicada em breve.
          </EmptyState>
        ) : (
          <PlayerDirectory
            teams={s.teams.map((t) => ({ id: t.id, name: t.name }))}
            players={entries.map((e) => ({
              slug: e.player.slug,
              name: e.player.name,
              nickname: e.player.nickname,
              photo: <PlayerAvatar player={e.player} size={44} ring={e.team?.primary_color} />,
              teamName: e.team?.name ?? null,
              teamColor: e.team?.primary_color ?? null,
              teamId: e.team?.id ?? null,
              position: e.player.position ? POSITION_LABELS[e.player.position] : null,
              goals: stats.get(e.player.id)?.goals ?? 0,
            }))}
          />
        )}
      </div>
    </>
  );
}

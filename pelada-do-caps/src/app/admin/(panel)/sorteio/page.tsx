import type { Metadata } from "next";
import Link from "next/link";
import { DraftBoard } from "@/components/admin/draft-board";
import { AdminPageTitle, Notice } from "@/components/admin/page-title";
import { Crest } from "@/components/ui/crest";
import { rosterEntries } from "@/domain/snapshot";
import { adminSnapshot } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Montagem dos times" };

export default async function AdminDraftPage() {
  const s = await adminSnapshot();
  const entries = rosterEntries(s).filter((e) => e.player.active);
  return (
    <>
      <AdminPageTitle
        title="Montagem dos times"
        description="Acompanhe o sorteio real: a cada jogador sorteado, toque no time dele. A página pública /sorteio atualiza sozinha."
      />
      {entries.length === 0 ? (
        <Notice>
          Nenhum jogador inscrito ainda. Cadastre a lista em <Link href="/admin/jogadores" className="text-accent underline">Jogadores</Link> (há cadastro em lote).
        </Notice>
      ) : (
        <DraftBoard
          maxPerTeam={s.rules.maxPlayersPerTeam}
          teams={s.teams.map((t) => ({ id: t.id, name: t.name, color: t.primary_color, crest: <Crest team={t} size={36} /> }))}
          players={entries.map((e) => ({
            id: e.player.id,
            name: e.player.name,
            nickname: e.player.nickname,
            position: e.player.position,
            goalkeeper: e.player.is_goalkeeper || e.player.position === "GOL",
            pot: e.registration.pot,
            teamId: e.registration.team_id,
          }))}
        />
      )}
    </>
  );
}

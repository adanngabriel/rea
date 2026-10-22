import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminList } from "@/components/admin/list";
import { AdminPageTitle, Notice } from "@/components/admin/page-title";
import { championOf } from "@/domain/bracket";
import { displayName, indexSnapshot } from "@/domain/snapshot";
import { AWARD_LABELS } from "@/components/admin/labels";
import { adminSnapshot } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Premiações" };


export default async function AdminAwardsPage() {
  const s = await adminSnapshot();
  const ix = indexSnapshot(s);
  const auto = championOf(s);
  return (
    <>
      <AdminPageTitle
        title="Premiações"
        description="Campeão, vice, prêmios individuais e destaques de cada rodada."
        actions={
          <Link href="/admin/premiacoes/novo" className="btn-primary btn-sm">
            <Plus className="size-4" aria-hidden /> Nova premiação
          </Link>
        }
      />
      <div className="max-w-4xl space-y-4">
        <Notice>
          O campeão e o vice são definidos automaticamente pelo resultado da final
          {auto ? ` (atualmente: ${ix.team(auto.championId)?.name})` : ""}. Cadastre aqui para registrar foto da premiação, prêmios individuais ou
          para corrigir manualmente.
        </Notice>
        <AdminList
          empty="Nenhuma premiação registrada."
          items={s.awards.map((a) => {
            const who = a.player_id ? ix.player(a.player_id) : null;
            return {
              id: a.id,
              href: `/admin/premiacoes/${a.id}`,
              title: a.title,
              meta: `${AWARD_LABELS[a.category]} • ${who ? displayName(who) : (ix.team(a.team_id)?.name ?? "")}${a.round_id ? ` • ${ix.round(a.round_id)?.name}` : ""}`,
            };
          })}
        />
      </div>
    </>
  );
}

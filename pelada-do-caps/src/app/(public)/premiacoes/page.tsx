import { Medal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AwardCard, tournamentPrizes } from "@/components/public/award-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/section";
import { indexSnapshot } from "@/domain/snapshot";
import { currentSnapshot } from "@/lib/data/require";

export const revalidate = 60;
export const metadata: Metadata = { title: "Premiações", description: "Os prêmios do torneio: o que cada vencedor leva para casa." };

export default async function PrizesPage() {
  const s = await currentSnapshot();
  const ix = indexSnapshot(s);
  const prizes = tournamentPrizes(s.awards);
  return (
    <>
      <PageHeader title="Premiações" eyebrow={s.edition.name}>
        O que está em jogo no torneio. Os vencedores aparecem aqui ao fim do campeonato.
      </PageHeader>
      <div className="container-page space-y-6 py-6 sm:py-10">
      {prizes.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {prizes.map((a) => (
            <li key={a.id}>
              <AwardCard award={a} ix={ix} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Medal} title="Premiações em breve">
          A organização vai divulgar os prêmios por aqui.
        </EmptyState>
      )}
      <p className="text-sm text-muted">
        Destaques de cada rodada ficam em <Link href="/estatisticas?aba=rodada" className="text-accent underline">Destaques</Link>.
      </p>
      </div>
    </>
  );
}

import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageTitle } from "@/components/admin/page-title";
import { Crest } from "@/components/ui/crest";
import { rosterEntries, teamRoster } from "@/domain/snapshot";
import { adminSnapshot } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Times" };

export default async function AdminTeamsPage() {
  const s = await adminSnapshot();
  const entries = rosterEntries(s);
  return (
    <>
      <AdminPageTitle
        title="Times"
        description="Nome, escudo, cores e capitão de cada time."
        actions={
          <Link href="/admin/times/novo" className="btn-primary btn-sm">
            <Plus className="size-4" aria-hidden /> Novo time
          </Link>
        }
      />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {s.teams.map((t) => (
          <li key={t.id}>
            <Link href={`/admin/times/${t.id}`} className="card card-hover flex items-center gap-3 p-4" style={{ borderTop: `3px solid ${t.primary_color}` }}>
              <Crest team={t} size={48} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{t.name}</p>
                <p className="text-xs text-muted">{teamRoster(entries, t.id).length} jogadores</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

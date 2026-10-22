import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { bulkAddPlayers } from "@/actions/players";
import { ActionForm, SubmitButton, TextArea } from "@/components/admin/form";
import { AdminPageTitle } from "@/components/admin/page-title";
import { PlayerAvatar } from "@/components/ui/avatar";
import { POSITION_LABELS } from "@/components/ui/badges";
import { indexSnapshot } from "@/domain/snapshot";
import { adminAllPlayers, adminSnapshot } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Jogadores" };

export default async function AdminPlayersPage({ searchParams }: { searchParams: Promise<{ q?: string; time?: string }> }) {
  const { q = "", time = "" } = await searchParams;
  const [s, players] = await Promise.all([adminSnapshot(), adminAllPlayers()]);
  const ix = indexSnapshot(s);
  const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const list = players.filter((p) => {
    const reg = ix.registration(p.id);
    if (time === "sem" && (!reg || reg.team_id)) return false;
    if (time === "fora" && reg) return false;
    if (time && time !== "sem" && time !== "fora" && reg?.team_id !== time) return false;
    return !q || norm(`${p.name} ${p.nickname ?? ""}`).includes(norm(q));
  });
  return (
    <>
      <AdminPageTitle
        title="Jogadores"
        description={`${players.length} cadastrados • ${s.registrations.length} inscritos nesta edição`}
        actions={
          <Link href="/admin/jogadores/novo" className="btn-primary btn-sm">
            <Plus className="size-4" aria-hidden /> Novo jogador
          </Link>
        }
      />
      <form className="mb-4 flex flex-col gap-2 sm:flex-row" role="search">
        <label className="flex-1">
          <span className="sr-only">Buscar</span>
          <input name="q" defaultValue={q} className="input" placeholder="Buscar por nome ou apelido" type="search" />
        </label>
        <label>
          <span className="sr-only">Filtrar por time</span>
          <select name="time" defaultValue={time} className="input sm:w-52">
            <option value="">Todos</option>
            {s.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
            <option value="sem">Inscritos sem time</option>
            <option value="fora">Não inscritos nesta edição</option>
          </select>
        </label>
        <button className="btn-secondary" type="submit">
          Filtrar
        </button>
      </form>
      <div className="card mb-8 overflow-hidden">
        {list.length === 0 ? (
          <p className="p-6 text-sm text-muted">Nenhum jogador encontrado.</p>
        ) : (
          <ul className="divide-y divide-line">
            {list.map((p) => {
              const reg = ix.registration(p.id);
              const team = ix.team(reg?.team_id);
              return (
                <li key={p.id}>
                  <Link href={`/admin/jogadores/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                    <PlayerAvatar player={p} size={36} ring={team?.primary_color} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {reg?.shirt_number != null ? <span className="tabular mr-1.5 text-muted">{reg.shirt_number}</span> : null}
                        {p.name}
                        {p.nickname ? <span className="text-muted"> ({p.nickname})</span> : null}
                        {!p.active ? <span className="ml-2 text-xs text-warning">inativo</span> : null}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {reg ? (team?.name ?? "Sem time") : "Não inscrito nesta edição"}
                        {p.position ? ` • ${POSITION_LABELS[p.position]}` : ""}
                        {reg?.pot ? ` • Pote ${reg.pot}` : ""}
                        {reg?.is_captain ? " • Capitão" : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <section className="card max-w-3xl p-5">
        <h2 className="font-display text-xl font-extrabold uppercase">Cadastro em lote</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Cole a lista de inscritos, um por linha. Opcionalmente separe com ponto e vírgula: <code className="text-ink">Nome; Apelido; Posição; Pote</code>. Todos
          entram nesta edição como &quot;sem time&quot;, prontos para o sorteio.
        </p>
        <ActionForm action={bulkAddPlayers} resetOnSuccess success="Jogadores cadastrados.">
          <TextArea label="Lista de jogadores" name="lines" rows={8} placeholder={"João da Silva; Joãozinho; Atacante; 1\nPedro Souza; ; Goleiro; 2\nLucas Lima"} />
          <SubmitButton>Cadastrar todos</SubmitButton>
        </ActionForm>
      </section>
    </>
  );
}

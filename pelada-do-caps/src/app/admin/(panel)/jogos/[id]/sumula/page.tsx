import { Star, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addEvent, deleteEvent, saveLineup, setMatchStatus, setMvp } from "@/actions/matches";
import { EventForm } from "@/components/admin/event-form";
import { ActionForm, ConfirmAction, SubmitButton } from "@/components/admin/form";
import { AdminPageTitle, Notice } from "@/components/admin/page-title";
import { CardIcon, StatusBadge, SuspendedBadge } from "@/components/ui/badges";
import { Crest } from "@/components/ui/crest";
import { computeDiscipline } from "@/domain/discipline";
import { STATUS_LABELS } from "@/domain/schedule";
import { scoreOf } from "@/domain/score";
import { displayName, indexSnapshot, matchStageLabel, rosterEntries, teamRoster } from "@/domain/snapshot";
import type { Match } from "@/domain/types";
import { adminSnapshot } from "@/lib/data/admin";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Súmula" };

const FLOW: { status: Match["status"]; label: string; tone: string }[] = [
  { status: "live", label: "▶ Iniciar / 2º tempo", tone: "btn-primary" },
  { status: "halftime", label: "⏸ Intervalo", tone: "btn-secondary" },
  { status: "finished", label: "🏁 Encerrar partida", tone: "btn-primary" },
];

export default async function SumulaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await adminSnapshot();
  const match = s.matches.find((m) => m.id === id);
  if (!match) notFound();
  const ix = indexSnapshot(s);
  const home = ix.team(match.home_team_id);
  const away = ix.team(match.away_team_id);
  const score = scoreOf(match, s.events);
  const events = s.events.filter((e) => e.match_id === match.id);
  const mvp = events.find((e) => e.type === "mvp");
  const entries = rosterEntries(s);
  const discipline = computeDiscipline(s);
  const lineup = new Set(s.lineups.filter((l) => l.match_id === match.id).map((l) => l.player_id));
  const sides = [home, away].filter((t) => t !== null).map((t) => ({
    team: t,
    roster: teamRoster(entries, t.id),
  }));
  const canLaunch = match.status === "live" || match.status === "halftime" || match.status === "finished";

  return (
    <>
      <AdminPageTitle
        title="Súmula"
        description={`${matchStageLabel(s, match)} • ${match.scheduled_at ? formatDateTime(match.scheduled_at) : "horário a definir"}`}
        back={{ href: "/admin/jogos", label: "Jogos" }}
        actions={
          <>
            <Link href={`/admin/jogos/${match.id}`} className="btn-ghost btn-sm">Editar dados</Link>
            <Link href={`/jogos/${match.id}`} target="_blank" className="btn-ghost btn-sm">Ver página pública</Link>
          </>
        }
      />
      <div className="space-y-6">
        <section className="card p-5" aria-label="Placar">
          <div className="mb-4 flex justify-center">
            <StatusBadge status={match.status} />
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex flex-col items-center gap-2 text-center">
              <Crest team={home} size={56} />
              <span className="font-semibold">{home?.name ?? "A definir"}</span>
            </div>
            <p className="tabular font-display text-6xl font-extrabold">
              {score.home}<span className="mx-2 text-muted">×</span>{score.away}
            </p>
            <div className="flex flex-col items-center gap-2 text-center">
              <Crest team={away} size={56} />
              <span className="font-semibold">{away?.name ?? "A definir"}</span>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted">O placar é calculado pelos gols lançados abaixo — para corrigir, remova ou adicione gols.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {FLOW.map((f) => (
              <ConfirmAction
                key={f.status}
                action={setMatchStatus.bind(null, match.id, f.status)}
                className={`${f.tone} btn-sm`}
                confirm={f.status === "finished" ? "Encerrar a partida? A classificação e as estatísticas serão atualizadas." : undefined}
                success={STATUS_LABELS[f.status]}
              >
                {f.label}
              </ConfirmAction>
            ))}
            {match.status === "finished" ? (
              <ConfirmAction action={setMatchStatus.bind(null, match.id, "live")} className="btn-ghost btn-sm" confirm="Reabrir a partida? Ela sai da classificação até ser encerrada de novo.">
                Reabrir
              </ConfirmAction>
            ) : null}
          </div>
        </section>

        {!home || !away ? <Notice tone="warning">Defina os dois times da partida para usar a súmula.</Notice> : null}
        {home && away && !canLaunch ? <Notice>Toque em &quot;Iniciar&quot; quando a bola rolar para liberar o lançamento de gols e cartões.</Notice> : null}

        {home && away && canLaunch ? (
          <div className="grid gap-6 xl:grid-cols-2">
            <section className="card p-5">
              <h2 className="mb-4 font-display text-xl font-extrabold uppercase">Lançar lance</h2>
              <EventForm
                action={addEvent.bind(null, match.id)}
                sides={sides.map(({ team, roster }) => ({
                  id: team.id,
                  name: team.name,
                  color: team.primary_color,
                  players: roster.map((e) => ({
                    id: e.player.id,
                    label: `${e.registration.shirt_number != null ? `${e.registration.shirt_number} — ` : ""}${displayName(e.player)}`,
                  })),
                }))}
              />
            </section>

            <section className="card p-5">
              <h2 className="mb-4 font-display text-xl font-extrabold uppercase">Lances registrados</h2>
              {events.filter((e) => e.type !== "mvp").length === 0 ? (
                <p className="text-sm text-muted">Nenhum lance ainda.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {events
                    .filter((e) => e.type !== "mvp")
                    .map((e) => {
                      const p = ix.player(e.player_id);
                      const a = ix.player(e.assist_player_id);
                      return (
                        <li key={e.id} className="flex items-center gap-3 py-2.5">
                          <span className="tabular w-9 text-sm text-muted">{e.minute != null ? `${e.minute}'` : "—"}</span>
                          {e.type === "yellow" ? <CardIcon color="yellow" /> : e.type === "red" ? <CardIcon color="red" /> : <span aria-hidden>⚽</span>}
                          <span className="min-w-0 flex-1 text-sm">
                            <strong>{p ? displayName(p) : "Autor não identificado"}</strong>
                            {e.type === "own_goal" ? " (contra)" : ""}
                            <span className="block text-xs text-muted">
                              {e.type === "own_goal" ? "Gol para " : ""}
                              {ix.team(e.team_id)?.name}
                              {a ? ` • Assist.: ${displayName(a)}` : ""}
                              {e.notes ? ` • ${e.notes}` : ""}
                            </span>
                          </span>
                          <ConfirmAction action={deleteEvent.bind(null, match.id, e.id)} className="btn-ghost btn-sm px-2" confirm="Remover este lance? Placar e estatísticas serão recalculados." success="Lance removido.">
                            <Trash2 className="size-4" aria-hidden />
                            <span className="sr-only">Remover</span>
                          </ConfirmAction>
                        </li>
                      );
                    })}
                </ul>
              )}
            </section>

            <section className="card p-5">
              <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-extrabold uppercase">
                <Star className="size-5 text-gold" aria-hidden /> Craque do jogo
              </h2>
              <ActionForm action={setMvp.bind(null, match.id)} success="Craque do jogo atualizado." className="flex flex-col gap-3 sm:flex-row">
                <label className="flex-1">
                  <span className="sr-only">Craque do jogo</span>
                  <select name="player_id" className="input" defaultValue={mvp?.player_id ?? ""}>
                    <option value="">Ninguém escolhido</option>
                    {sides.map(({ team, roster }) => (
                      <optgroup key={team.id} label={team.name}>
                        {roster.map((e) => (
                          <option key={e.player.id} value={e.player.id}>
                            {displayName(e.player)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <SubmitButton className="btn-secondary">Salvar</SubmitButton>
              </ActionForm>
            </section>

            <section className="card p-5">
              <h2 className="mb-1 font-display text-xl font-extrabold uppercase">Escalação (opcional)</h2>
              <p className="mb-4 text-xs text-muted">Marque quem jogou. Sem escalação, considera-se que o elenco inteiro participou.</p>
              <ActionForm action={saveLineup.bind(null, match.id)} success="Escalação salva.">
                <div className="grid gap-4 sm:grid-cols-2">
                  {sides.map(({ team, roster }) => (
                    <fieldset key={team.id}>
                      <legend className="mb-2 text-sm font-semibold">{team.name}</legend>
                      <ul className="space-y-1">
                        {roster.map((e) => {
                          const d = discipline.get(e.player.id);
                          return (
                            <li key={e.player.id}>
                              <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" name="player_id" value={e.player.id} defaultChecked={lineup.has(e.player.id)} className="size-4 accent-[var(--color-accent)]" />
                                {displayName(e.player)}
                                {d?.nextMissedMatchId === match.id ? <SuspendedBadge /> : null}
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </fieldset>
                  ))}
                </div>
                <SubmitButton className="btn-secondary">Salvar escalação</SubmitButton>
              </ActionForm>
            </section>
          </div>
        ) : null}
      </div>
    </>
  );
}

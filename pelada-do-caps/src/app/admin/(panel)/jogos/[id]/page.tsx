import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteMatch, saveMatch } from "@/actions/matches";
import { ActionForm, CheckboxField, ConfirmAction, FormSection, SelectField, SubmitButton, TextArea, TextField } from "@/components/admin/form";
import { AdminPageTitle, Notice } from "@/components/admin/page-title";
import { STATUS_LABELS } from "@/domain/schedule";
import { adminSnapshot } from "@/lib/data/admin";
import { isoToZonedInput } from "@/lib/format";

export const metadata: Metadata = { title: "Partida" };

export default async function AdminMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await adminSnapshot();
  const match = id === "novo" ? null : s.matches.find((m) => m.id === id);
  if (id !== "novo" && !match) notFound();
  const teamOptions = s.teams.map((t) => ({ value: t.id, label: t.name }));
  return (
    <>
      <AdminPageTitle
        title={match ? "Editar partida" : "Novo jogo"}
        back={{ href: "/admin/jogos", label: "Jogos" }}
        actions={match ? <Link href={`/admin/jogos/${match.id}/sumula`} className="btn-secondary btn-sm">Abrir súmula</Link> : null}
      />
      <ActionForm action={saveMatch.bind(null, match?.id ?? null)} className="max-w-3xl space-y-6">
        <FormSection title="Confronto">
          {match?.bracket_slot ? (
            <Notice>
              Jogo do mata-mata ({match.label}). Os times são preenchidos automaticamente pelas regras; marque &quot;travar times&quot; para um
              ajuste manual excepcional.
            </Notice>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Time A (mandante)" name="home_team_id" defaultValue={match?.home_team_id ?? ""} placeholder="A definir" options={teamOptions} />
            <SelectField label="Time B (visitante)" name="away_team_id" defaultValue={match?.away_team_id ?? ""} placeholder="A definir" options={teamOptions} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField label="Rodada" name="round_id" defaultValue={match?.round_id ?? ""} placeholder="Sem rodada" options={s.rounds.map((r) => ({ value: r.id, label: r.name }))} />
            <SelectField
              label="Fase"
              name="phase"
              defaultValue={match?.phase ?? "group"}
              options={[
                { value: "group", label: "Classificatória" },
                { value: "knockout", label: "Mata-mata" },
              ]}
            />
            <TextField label="Nome do jogo (opcional)" name="label" defaultValue={match?.label ?? ""} placeholder="Ex.: Semifinal 1" maxLength={60} />
          </div>
          {match?.bracket_slot ? (
            <CheckboxField label="Travar times (ajuste manual)" name="teams_locked" defaultChecked={match.teams_locked} hint="O preenchimento automático do chaveamento não altera este jogo." />
          ) : (
            <input type="hidden" name="teams_locked" value="" />
          )}
        </FormSection>
        <FormSection title="Agenda">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Data e horário"
              name="scheduled_at"
              type="datetime-local"
              defaultValue={isoToZonedInput(match?.scheduled_at ?? null)}
              hint="Horário de Fortaleza. Deixe vazio se ainda não definido."
            />
            <TextField label="Local" name="venue" defaultValue={match?.venue ?? s.edition.venue ?? ""} maxLength={120} />
          </div>
          <SelectField
            label="Status"
            name="status"
            defaultValue={match?.status ?? "scheduled"}
            options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </FormSection>
        <FormSection title="Detalhes">
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Público (opcional)" name="attendance" type="number" min={0} defaultValue={match?.attendance ?? ""} />
            <TextField label="Pênaltis — Time A" name="home_penalties" type="number" min={0} defaultValue={match?.home_penalties ?? ""} hint="Só em mata-mata empatado" />
            <TextField label="Pênaltis — Time B" name="away_penalties" type="number" min={0} defaultValue={match?.away_penalties ?? ""} />
          </div>
          <TextArea label="Observações (públicas)" name="notes" defaultValue={match?.notes ?? ""} rows={3} />
        </FormSection>
        <div className="flex flex-wrap justify-between gap-3">
          <SubmitButton>Salvar partida</SubmitButton>
          {match ? (
            <ConfirmAction action={deleteMatch.bind(null, match.id)} confirm="Excluir esta partida e todos os eventos da súmula? A classificação será recalculada.">
              Excluir partida
            </ConfirmAction>
          ) : null}
        </div>
      </ActionForm>
    </>
  );
}

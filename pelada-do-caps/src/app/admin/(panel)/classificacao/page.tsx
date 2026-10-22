import type { Metadata } from "next";
import { saveGeneralRules, saveScoringRules } from "@/actions/edition";
import { ActionForm, FormSection, SubmitButton, TextField } from "@/components/admin/form";
import { OrderEditor } from "@/components/admin/order-editor";
import { AdminPageTitle, Notice } from "@/components/admin/page-title";
import { QualificationLegend, StandingsTable } from "@/components/public/standings-table";
import { qualificationMarks } from "@/domain/bracket";
import { TIEBREAKER_LABELS, TIEBREAKERS } from "@/domain/rules";
import { computeStandings } from "@/domain/standings";
import { adminSnapshot } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Classificação" };

export default async function AdminStandingsPage() {
  const s = await adminSnapshot();
  const rows = computeStandings(s.teams, s.matches, s.events, s.rules);
  const marks = qualificationMarks(s.rules.knockout.slots);
  const { points } = s.rules;
  return (
    <>
      <AdminPageTitle
        title="Classificação"
        description="A tabela é calculada automaticamente pelas partidas encerradas da fase classificatória. Aqui você define pontuação e critérios."
      />
      <div className="max-w-4xl space-y-6">
        <StandingsTable rows={rows} marks={marks} />
        <QualificationLegend marks={marks} />
        {rows.some((r) => r.unresolvedTie) ? (
          <Notice tone="warning">
            Há times empatados em todos os critérios. Adicione o critério &quot;Sorteio / decisão da organização&quot; e defina a ordem abaixo.
          </Notice>
        ) : null}
        <ActionForm action={saveScoringRules} className="space-y-6" success="Regras salvas.">
          <FormSection title="Pontuação">
            <div className="grid grid-cols-3 gap-3">
              <TextField label="Vitória" name="win" type="number" min={0} max={10} defaultValue={points.win} />
              <TextField label="Empate" name="draw" type="number" min={0} max={10} defaultValue={points.draw} />
              <TextField label="Derrota" name="loss" type="number" min={0} max={10} defaultValue={points.loss} />
            </div>
          </FormSection>
          <FormSection title="Critérios de classificação" description="Aplicados em ordem; cada critério só desempata quem continua empatado nos anteriores.">
            <OrderEditor name="tiebreakers" initial={s.rules.tiebreakers} options={TIEBREAKERS.map((t) => ({ value: t, label: TIEBREAKER_LABELS[t] }))} />
          </FormSection>
          <FormSection
            title="Ordem por sorteio / decisão"
            description='Usada somente quando o critério "Sorteio / decisão da organização" estiver na lista acima.'
          >
            <OrderEditor
              name="manualOrder"
              initial={s.rules.manualOrder.length ? s.rules.manualOrder : s.teams.map((t) => t.id)}
              options={s.teams.map((t) => ({ value: t.id, label: t.name }))}
              allowRemove={false}
            />
          </FormSection>
          <SubmitButton>Salvar e recalcular</SubmitButton>
        </ActionForm>
        <ActionForm action={saveGeneralRules} className="space-y-6" success="Regras gerais salvas.">
          <FormSection title="Regras gerais" description="Informativas: aparecem no painel e ajudam no sorteio. Deixe vazio se ainda não definido.">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Duração da partida (minutos)" name="matchDurationMinutes" type="number" min={1} defaultValue={s.rules.matchDurationMinutes ?? ""} />
              <TextField label="Máximo de jogadores por time" name="maxPlayersPerTeam" type="number" min={1} defaultValue={s.rules.maxPlayersPerTeam ?? ""} />
            </div>
          </FormSection>
          <SubmitButton className="btn-secondary">Salvar regras gerais</SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}

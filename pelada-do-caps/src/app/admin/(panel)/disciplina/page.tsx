import type { Metadata } from "next";
import { saveDisciplineRules } from "@/actions/edition";
import { addManualSuspension, deleteSuspensionRecord, voidAutoSuspension } from "@/actions/discipline";
import { ActionForm, CheckboxField, ConfirmAction, FormSection, SelectField, SubmitButton, TextField } from "@/components/admin/form";
import { AdminPageTitle, Notice } from "@/components/admin/page-title";
import { CardIcon, SuspendedBadge } from "@/components/ui/badges";
import { computeDiscipline, disciplineConfigured } from "@/domain/discipline";
import { orderedMatches } from "@/domain/schedule";
import { displayName, indexSnapshot, matchStageLabel, rosterEntries } from "@/domain/snapshot";
import { adminSnapshot } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Cartões e suspensões" };

export default async function AdminDisciplinePage() {
  const s = await adminSnapshot();
  const d = s.rules.discipline;
  const status = computeDiscipline(s);
  const ix = indexSnapshot(s);
  const entries = rosterEntries(s);
  const rows = entries.map((e) => ({ e, st: status.get(e.player.id)! })).filter(({ st }) => st && (st.yellow || st.red || st.entries.length));
  return (
    <>
      <AdminPageTitle title="Cartões e suspensões" description="Os cartões vêm das súmulas. As suspensões automáticas seguem as regras abaixo; decisões manuais ficam registradas com justificativa." />
      <div className="max-w-5xl space-y-6">
        {!disciplineConfigured(s) ? <Notice tone="warning">Nenhuma regra de suspensão automática definida. Os cartões são contados, mas ninguém é suspenso automaticamente.</Notice> : null}
        <ActionForm action={saveDisciplineRules} success="Regras disciplinares salvas.">
          <FormSection title="Regras disciplinares" description="Deixe em branco para não aplicar suspensão automática.">
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField label="Amarelos para suspensão" name="yellowsForSuspension" type="number" min={1} defaultValue={d.yellowsForSuspension ?? ""} hint="Ex.: 2 ou 3" />
              <TextField label="Jogos de suspensão (amarelos)" name="yellowSuspensionMatches" type="number" min={1} defaultValue={d.yellowSuspensionMatches} />
              <TextField label="Jogos de suspensão (vermelho)" name="redSuspensionMatches" type="number" min={1} defaultValue={d.redSuspensionMatches ?? ""} hint="Vazio = vermelho não suspende automaticamente" />
            </div>
            <CheckboxField
              label="Amarelo no mesmo jogo do vermelho não conta para acumulação"
              name="redCancelsSameMatchYellows"
              defaultChecked={d.redCancelsSameMatchYellows}
            />
            <SubmitButton>Salvar regras</SubmitButton>
          </FormSection>
        </ActionForm>

        <section className="card overflow-hidden">
          <h2 className="border-b border-line p-5 font-display text-xl font-extrabold uppercase">Situação dos jogadores</h2>
          {rows.length === 0 ? (
            <p className="p-5 text-sm text-muted">Nenhum cartão ou suspensão até agora.</p>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map(({ e, st }) => (
                <li key={e.player.id} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <strong>{displayName(e.player)}</strong>
                    <span className="text-xs text-muted">{e.team?.name ?? "Sem time"}</span>
                    <CardIcon color="yellow" count={st.yellow} />
                    <CardIcon color="red" count={st.red} />
                    {st.suspended ? <SuspendedBadge /> : null}
                    {st.nextMissedMatchId ? (
                      <span className="text-xs text-muted">Cumpre em: {matchStageLabel(s, s.matches.find((m) => m.id === st.nextMissedMatchId)!)}</span>
                    ) : null}
                  </div>
                  {st.entries.map((x) => (
                    <div key={x.key} className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                      <span className="flex-1">
                        {x.source === "manual" ? "Manual" : "Automática"}: {x.reason} — {x.voided ? "anulada" : `${x.served}/${x.matches} cumprida(s)`}
                      </span>
                      {x.recordId ? (
                        <ConfirmAction action={deleteSuspensionRecord.bind(null, x.recordId)} className="btn-ghost btn-sm" confirm={x.source === "manual" ? "Remover esta suspensão manual?" : "Desfazer a anulação? A suspensão volta a valer."}>
                          {x.source === "manual" ? "Remover" : "Desfazer anulação"}
                        </ConfirmAction>
                      ) : (
                        <ActionForm action={voidAutoSuspension.bind(null, e.player.id, x.key)} className="flex w-full gap-2 sm:w-auto" success="Suspensão anulada.">
                          <label className="flex-1">
                            <span className="sr-only">Justificativa</span>
                            <input name="reason" className="input py-1.5 text-sm" placeholder="Justificativa para anular" required />
                          </label>
                          <SubmitButton className="btn-ghost btn-sm">Anular</SubmitButton>
                        </ActionForm>
                      )}
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </section>

        <ActionForm action={addManualSuspension} resetOnSuccess success="Suspensão registrada.">
          <FormSection title="Suspensão manual" description="Para decisões da organização (ex.: comportamento antidesportivo).">
            <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
              <SelectField
                label="Jogador"
                name="player_id"
                placeholder="Escolha"
                options={entries.map((e) => ({ value: e.player.id, label: `${displayName(e.player)}${e.team ? ` (${e.team.name})` : ""}` }))}
              />
              <TextField label="Jogos" name="matches" type="number" min={1} defaultValue={1} />
            </div>
            <SelectField
              label="Começa a contar depois do jogo"
              name="from_match_id"
              placeholder="Do próximo jogo do time em diante"
              options={orderedMatches(s).map((m) => ({
                value: m.id,
                label: `${matchStageLabel(s, m)} — ${ix.team(m.home_team_id)?.name ?? "?"} × ${ix.team(m.away_team_id)?.name ?? "?"}`,
              }))}
            />
            <TextField label="Justificativa" name="reason" maxLength={500} />
            <SubmitButton>Registrar suspensão</SubmitButton>
          </FormSection>
        </ActionForm>
      </div>
    </>
  );
}

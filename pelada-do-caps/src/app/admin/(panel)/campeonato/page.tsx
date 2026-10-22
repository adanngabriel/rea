import type { Metadata } from "next";
import { createEdition, deleteRound, saveEdition, saveRound, setCurrentEdition } from "@/actions/edition";
import { ActionForm, ConfirmAction, FormSection, SelectField, SubmitButton, TextArea, TextField } from "@/components/admin/form";
import { AdminPageTitle, Notice } from "@/components/admin/page-title";
import { ImageUpload } from "@/components/admin/upload";
import type { Snapshot } from "@/domain/snapshot";
import type { Edition } from "@/domain/types";
import { adminRows, adminSnapshotOrNull } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Campeonato" };

export default async function AdminEditionPage() {
  const s = await adminSnapshotOrNull();
  const editions = await adminRows<Edition>("editions", [{ column: "starts_on", ascending: false }]);
  return (
    <>
      <AdminPageTitle title="Campeonato" description="Nome, datas, local, calendário de rodadas e edições do torneio." />
      <div className="max-w-4xl space-y-6">
        {s ? <CurrentEdition s={s} /> : <Notice tone="warning">Nenhuma edição está marcada como atual. Escolha uma abaixo.</Notice>}
        <EditionsSection editions={editions} />
      </div>
    </>
  );
}

function CurrentEdition({ s }: { s: Snapshot }) {
  const e = s.edition;
  return (
    <>
        <ActionForm action={saveEdition} className="space-y-6" success="Campeonato atualizado.">
          <FormSection title="Edição atual">
            <TextField label="Nome do campeonato" name="name" defaultValue={e.name} required />
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField label="Temporada" name="season" defaultValue={e.season ?? ""} placeholder="2026" />
              <TextField label="Nº da edição" name="edition_number" type="number" min={1} defaultValue={e.edition_number ?? ""} />
              <SelectField
                label="Situação"
                name="status"
                defaultValue={e.status}
                options={[
                  { value: "upcoming", label: "Em breve" },
                  { value: "ongoing", label: "Em andamento" },
                  { value: "finished", label: "Encerrado" },
                ]}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Data de início" name="starts_on" type="date" defaultValue={e.starts_on ?? ""} />
              <TextField label="Data de término" name="ends_on" type="date" defaultValue={e.ends_on ?? ""} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Local" name="venue" defaultValue={e.venue ?? ""} />
              <TextField label="Endereço (opcional)" name="venue_address" defaultValue={e.venue_address ?? ""} />
            </div>
            <TextField label="Frase de apresentação" name="description" defaultValue={e.description ?? ""} maxLength={300} hint="Aparece no topo da página Sobre." />
            <TextArea
              label="Sobre o torneio"
              name="about"
              defaultValue={e.about ?? ""}
              rows={8}
              hint="Texto da página Sobre. Use ## para títulos, - para listas, **negrito** e [texto](https://link)."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <ImageUpload name="logo_url" label="Logo do torneio" folder="identidade" defaultValue={e.logo_url} />
              <ImageUpload name="hero_image_url" label="Imagem de fundo da home" folder="identidade" defaultValue={e.hero_image_url} aspect="wide" />
            </div>
          </FormSection>
          <SubmitButton>Salvar campeonato</SubmitButton>
        </ActionForm>

        <section className="card space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="font-display text-xl font-extrabold uppercase">Calendário de rodadas</h2>
            <p className="mt-1 text-sm text-muted">Cada jogo pertence a uma rodada. Horários são definidos em cada partida.</p>
          </div>
          <ul className="space-y-3">
            {s.rounds.map((r) => (
              <li key={r.id} className="rounded-2xl border border-line p-3">
                <ActionForm action={saveRound.bind(null, r.id)} className="grid items-end gap-3 sm:grid-cols-[1fr_9rem_10rem_5rem_auto]" success="Rodada salva.">
                  <TextField label="Nome" name="name" defaultValue={r.name} />
                  <SelectField label="Fase" name="phase" defaultValue={r.phase} options={[{ value: "group", label: "Classificatória" }, { value: "knockout", label: "Mata-mata" }]} />
                  <TextField label="Data" name="scheduled_on" type="date" defaultValue={r.scheduled_on ?? ""} />
                  <TextField label="Ordem" name="sort_order" type="number" min={0} defaultValue={r.sort_order} />
                  <input type="hidden" name="notes" value={r.notes ?? ""} />
                  <div className="flex gap-2">
                    <SubmitButton className="btn-secondary btn-sm">Salvar</SubmitButton>
                    <ConfirmAction action={deleteRound.bind(null, r.id)} confirm={`Excluir ${r.name}? Os jogos dela ficam sem rodada.`} className="btn-ghost btn-sm">
                      Excluir
                    </ConfirmAction>
                  </div>
                </ActionForm>
              </li>
            ))}
          </ul>
          <ActionForm action={saveRound.bind(null, null)} className="grid items-end gap-3 rounded-2xl border border-dashed border-line-strong p-3 sm:grid-cols-[1fr_9rem_10rem_5rem_auto]" resetOnSuccess success="Rodada criada.">
            <TextField label="Nova rodada" name="name" placeholder="Ex.: Semifinal" />
            <SelectField label="Fase" name="phase" defaultValue="group" options={[{ value: "group", label: "Classificatória" }, { value: "knockout", label: "Mata-mata" }]} />
            <TextField label="Data" name="scheduled_on" type="date" />
            <TextField label="Ordem" name="sort_order" type="number" min={0} defaultValue={s.rounds.length + 1} />
            <input type="hidden" name="notes" value="" />
            <SubmitButton className="btn-primary btn-sm">Adicionar</SubmitButton>
          </ActionForm>
        </section>
    </>
  );
}

function EditionsSection({ editions }: { editions: Edition[] }) {
  return (
        <section className="card space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="font-display text-xl font-extrabold uppercase">Edições</h2>
            <p className="mt-1 text-sm text-muted">Prepare futuras edições. O site e o painel mostram sempre a edição marcada como atual; as anteriores ficam no Hall dos Campeões.</p>
          </div>
          <ul className="divide-y divide-line">
            {editions.map((ed) => (
              <li key={ed.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="flex-1">
                  <strong>{ed.name}</strong> <span className="text-sm text-muted">{ed.season}</span>
                </span>
                {ed.is_current ? (
                  <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent">Atual</span>
                ) : (
                  <ConfirmAction action={setCurrentEdition.bind(null, ed.id)} className="btn-secondary btn-sm" confirm={`Tornar "${ed.name}" a edição atual do site e do painel?`}>
                    Tornar atual
                  </ConfirmAction>
                )}
              </li>
            ))}
          </ul>
          <Notice>A nova edição copia as regras e o local da atual. Times, jogadores inscritos e jogos são cadastrados de novo para cada edição (o cadastro de jogadores é reaproveitado).</Notice>
          <ActionForm action={createEdition} className="grid items-end gap-3 sm:grid-cols-2" resetOnSuccess success="Edição criada.">
            <TextField label="Nome da nova edição" name="name" placeholder="2º Torneio da Pelada do Caps" />
            <TextField label="Temporada" name="season" placeholder="2027" />
            <TextField label="Nº da edição" name="edition_number" type="number" min={1} />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Início" name="starts_on" type="date" />
              <TextField label="Término" name="ends_on" type="date" />
            </div>
            <SubmitButton className="btn-secondary">Criar edição</SubmitButton>
          </ActionForm>
        </section>
  );
}

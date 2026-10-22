import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deleteTeam, saveTeam } from "@/actions/teams";
import { ActionForm, ColorField, ConfirmAction, FormSection, SelectField, SubmitButton, TextArea, TextField } from "@/components/admin/form";
import { AdminPageTitle } from "@/components/admin/page-title";
import { ImageUpload } from "@/components/admin/upload";
import { displayName, rosterEntries, teamRoster } from "@/domain/snapshot";
import { adminSnapshot } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Time" };

export default async function AdminTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await adminSnapshot();
  const team = id === "novo" ? null : s.teams.find((t) => t.id === id);
  if (id !== "novo" && !team) notFound();
  const roster = team ? teamRoster(rosterEntries(s), team.id) : [];
  const captain = roster.find((e) => e.registration.is_captain);
  return (
    <>
      <AdminPageTitle title={team ? team.name : "Novo time"} back={{ href: "/admin/times", label: "Times" }} />
      <ActionForm action={saveTeam.bind(null, team?.id ?? null)} className="max-w-3xl space-y-6">
        <FormSection title="Identidade">
          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <TextField label="Nome do time" name="name" defaultValue={team?.name} required maxLength={60} />
            <TextField label="Sigla" name="short_name" defaultValue={team?.short_name ?? ""} maxLength={5} hint="Até 5 letras" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField label="Cor principal" name="primary_color" defaultValue={team?.primary_color ?? "#22c55e"} />
            <ColorField label="Cor secundária" name="secondary_color" defaultValue={team?.secondary_color ?? "#ffffff"} />
          </div>
          <ImageUpload name="crest_url" label="Escudo" folder="escudos" defaultValue={team?.crest_url} hint="PNG com fundo transparente fica melhor." />
          <ImageUpload name="photo_url" label="Foto oficial do time" folder="times" defaultValue={team?.photo_url} aspect="wide" />
          <TextArea label="Descrição (opcional)" name="description" defaultValue={team?.description ?? ""} rows={3} />
        </FormSection>
        <FormSection title="Detalhes">
          {team ? (
            <SelectField
              label="Capitão"
              name="captain_player_id"
              defaultValue={captain?.player.id ?? ""}
              placeholder="Sem capitão definido"
              options={roster.map((e) => ({ value: e.player.id, label: displayName(e.player) }))}
              hint={roster.length ? undefined : "Adicione jogadores ao time na Montagem dos times para escolher o capitão."}
            />
          ) : (
            <input type="hidden" name="captain_player_id" value="" />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Endereço da página" name="slug" defaultValue={team?.slug ?? ""} hint="Ex.: time-azul → /times/time-azul. Deixe vazio para gerar pelo nome." />
            <TextField label="Ordem de exibição" name="sort_order" type="number" min={0} defaultValue={team?.sort_order ?? s.teams.length + 1} />
          </div>
        </FormSection>
        <div className="flex flex-wrap justify-between gap-3">
          <SubmitButton>Salvar time</SubmitButton>
          {team ? (
            <ConfirmAction action={deleteTeam.bind(null, team.id)} confirm={`Excluir o time ${team.name}? Os jogadores voltam para "sem time".`}>
              Excluir time
            </ConfirmAction>
          ) : null}
        </div>
      </ActionForm>
    </>
  );
}

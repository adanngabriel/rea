import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deleteAward, saveAward } from "@/actions/content";
import { ActionForm, ConfirmAction, FormSection, SelectField, SubmitButton, TextArea, TextField } from "@/components/admin/form";
import { AdminPageTitle } from "@/components/admin/page-title";
import { ImageUpload } from "@/components/admin/upload";
import { displayName, rosterEntries } from "@/domain/snapshot";
import { adminSnapshot } from "@/lib/data/admin";
import { AWARD_LABELS } from "@/components/admin/labels";

export const metadata: Metadata = { title: "Premiação" };

export default async function AdminAwardEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await adminSnapshot();
  const award = id === "novo" ? null : s.awards.find((a) => a.id === id);
  if (id !== "novo" && !award) notFound();
  return (
    <>
      <AdminPageTitle title={award ? "Editar premiação" : "Nova premiação"} back={{ href: "/admin/premiacoes", label: "Premiações" }} />
      <ActionForm action={saveAward.bind(null, award?.id ?? null)} className="max-w-3xl space-y-6">
        <FormSection title="Premiação">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Tipo" name="category" defaultValue={award?.category ?? "best_player"} options={Object.entries(AWARD_LABELS).map(([value, label]) => ({ value, label }))} />
            <TextField label="Título exibido" name="title" defaultValue={award?.title ?? ""} placeholder="Ex.: Craque do torneio" maxLength={80} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Time" name="team_id" defaultValue={award?.team_id ?? ""} placeholder="—" options={s.teams.map((t) => ({ value: t.id, label: t.name }))} />
            <SelectField
              label="Jogador"
              name="player_id"
              defaultValue={award?.player_id ?? ""}
              placeholder="—"
              options={rosterEntries(s).map((e) => ({ value: e.player.id, label: `${displayName(e.player)}${e.team ? ` (${e.team.name})` : ""}` }))}
            />
          </div>
          <SelectField label="Rodada (para destaques da rodada)" name="round_id" defaultValue={award?.round_id ?? ""} placeholder="Geral" options={s.rounds.map((r) => ({ value: r.id, label: r.name }))} />
          <TextArea label="Descrição" name="description" defaultValue={award?.description ?? ""} rows={2} />
          <ImageUpload name="image_url" label="Foto da premiação" folder="premiacoes" defaultValue={award?.image_url} aspect="wide" />
          <TextField label="Ordem" name="sort_order" type="number" min={0} defaultValue={award?.sort_order ?? 0} />
        </FormSection>
        <div className="flex flex-wrap justify-between gap-3">
          <SubmitButton>Salvar</SubmitButton>
          {award ? <ConfirmAction action={deleteAward.bind(null, award.id)} confirm="Excluir esta premiação?">Excluir</ConfirmAction> : null}
        </div>
      </ActionForm>
    </>
  );
}

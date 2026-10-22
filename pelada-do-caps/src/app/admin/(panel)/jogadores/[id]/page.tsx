import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePlayer, savePlayer } from "@/actions/players";
import { ActionForm, CheckboxField, ConfirmAction, FormSection, SelectField, SubmitButton, TextArea, TextField } from "@/components/admin/form";
import { AdminPageTitle } from "@/components/admin/page-title";
import { ImageUpload } from "@/components/admin/upload";
import { POSITION_LABELS } from "@/components/ui/badges";
import { indexSnapshot } from "@/domain/snapshot";
import { adminAllPlayers, adminSnapshot } from "@/lib/data/admin";
import { serverClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Jogador" };

export default async function AdminPlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [s, players] = await Promise.all([adminSnapshot(), adminAllPlayers()]);
  const player = id === "novo" ? null : players.find((p) => p.id === id);
  if (id !== "novo" && !player) notFound();
  const reg = player ? indexSnapshot(s).registration(player.id) : null;
  let notes = "";
  if (player) {
    const db = await serverClient();
    const { data } = await db.from("player_admin_notes").select("notes").eq("player_id", player.id).maybeSingle();
    notes = (data as { notes: string } | null)?.notes ?? "";
  }
  return (
    <>
      <AdminPageTitle
        title={player ? player.name : "Novo jogador"}
        back={{ href: "/admin/jogadores", label: "Jogadores" }}
        actions={player && reg ? <Link href={`/jogadores/${player.slug}`} target="_blank" className="btn-ghost btn-sm">Ver página pública</Link> : null}
      />
      <ActionForm action={savePlayer.bind(null, player?.id ?? null)} className="max-w-3xl space-y-6">
        <FormSection title="Dados do jogador">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Nome completo" name="name" defaultValue={player?.name} required maxLength={80} />
            <TextField label="Apelido" name="nickname" defaultValue={player?.nickname ?? ""} maxLength={40} hint="Exibido no site quando preenchido" />
          </div>
          <ImageUpload name="photo_url" label="Foto" folder="jogadores" defaultValue={player?.photo_url} />
          <SelectField
            label="Posição"
            name="position"
            defaultValue={player?.position ?? ""}
            placeholder="Não informada"
            options={Object.entries(POSITION_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <CheckboxField label="Goleiro" name="is_goalkeeper" defaultChecked={player?.is_goalkeeper} hint="Marque também para quem joga na linha e no gol." />
          <CheckboxField label="Ativo" name="active" defaultChecked={player ? player.active : true} hint="Jogadores inativos somem da lista pública e do sorteio." />
          <TextArea label="Observações internas" name="notes" defaultValue={notes} rows={3} hint="Visível apenas no painel." />
        </FormSection>
        <FormSection title={`Inscrição — ${s.edition.name}`}>
          <CheckboxField label="Inscrito nesta edição" name="registered" defaultChecked={player ? Boolean(reg) : true} />
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField
              label="Time"
              name="team_id"
              defaultValue={reg?.team_id ?? ""}
              placeholder="Sem time (aguardando sorteio)"
              options={s.teams.map((t) => ({ value: t.id, label: t.name }))}
            />
            <TextField label="Número da camisa" name="shirt_number" type="number" min={0} max={999} inputMode="numeric" defaultValue={reg?.shirt_number ?? ""} />
            <TextField label="Pote / nível" name="pot" defaultValue={reg?.pot ?? ""} maxLength={20} hint="Opcional, usado no sorteio" />
          </div>
          <CheckboxField label="Capitão do time" name="is_captain" defaultChecked={reg?.is_captain} />
        </FormSection>
        <div className="flex flex-wrap justify-between gap-3">
          <SubmitButton>Salvar jogador</SubmitButton>
          {player ? (
            <ConfirmAction action={deletePlayer.bind(null, player.id)} confirm={`Excluir ${player.name}? Esta ação não pode ser desfeita.`}>
              Excluir jogador
            </ConfirmAction>
          ) : null}
        </div>
      </ActionForm>
    </>
  );
}

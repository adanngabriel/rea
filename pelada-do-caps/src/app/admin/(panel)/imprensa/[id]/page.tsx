import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deletePress, savePress } from "@/actions/content";
import { ActionForm, ConfirmAction, FormSection, SubmitButton, TextArea, TextField } from "@/components/admin/form";
import { AdminPageTitle } from "@/components/admin/page-title";
import { ImageUpload } from "@/components/admin/upload";
import type { PressLink } from "@/lib/data/content";
import { adminRow } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Matéria" };

export default async function AdminPressEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = id === "novo" ? null : await adminRow<PressLink>("press_links", id);
  if (id !== "novo" && !item) notFound();
  return (
    <>
      <AdminPageTitle title={item ? "Editar matéria" : "Nova matéria"} back={{ href: "/admin/imprensa", label: "Na mídia" }} />
      <ActionForm action={savePress.bind(null, item?.id ?? null)} className="max-w-3xl space-y-6">
        <FormSection title="Matéria">
          <TextField label="Título" name="title" defaultValue={item?.title} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Veículo" name="outlet" defaultValue={item?.outlet ?? ""} placeholder="Ex.: Diário do Nordeste" />
            <TextField label="Data" name="published_on" type="date" defaultValue={item?.published_on ?? ""} />
          </div>
          <TextField label="Link da matéria" name="url" type="url" defaultValue={item?.url ?? ""} placeholder="https://" />
          <TextArea label="Resumo" name="summary" defaultValue={item?.summary ?? ""} rows={3} />
          <ImageUpload name="image_url" label="Imagem" folder="imprensa" defaultValue={item?.image_url} aspect="wide" />
        </FormSection>
        <div className="flex flex-wrap justify-between gap-3">
          <SubmitButton>Salvar</SubmitButton>
          {item ? <ConfirmAction action={deletePress.bind(null, item.id)} confirm="Excluir esta matéria?">Excluir</ConfirmAction> : null}
        </div>
      </ActionForm>
    </>
  );
}

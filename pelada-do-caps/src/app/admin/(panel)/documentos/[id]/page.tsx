import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deleteDocument, saveDocument } from "@/actions/content";
import { ActionForm, CheckboxField, ConfirmAction, FormSection, SelectField, SubmitButton, TextArea, TextField } from "@/components/admin/form";
import { AdminPageTitle } from "@/components/admin/page-title";
import { FileUpload } from "@/components/admin/upload";
import { DOCUMENT_CATEGORIES, type DocumentItem } from "@/lib/data/content";
import { adminRow } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Documento" };

export default async function AdminDocumentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = id === "novo" ? null : await adminRow<DocumentItem>("documents", id);
  if (id !== "novo" && !item) notFound();
  return (
    <>
      <AdminPageTitle title={item ? "Editar documento" : "Novo documento"} back={{ href: "/admin/documentos", label: "Documentos" }} />
      <ActionForm action={saveDocument.bind(null, item?.id ?? null)} className="max-w-3xl space-y-6">
        <FormSection title="Documento">
          <TextField label="Título" name="title" defaultValue={item?.title} required />
          <TextArea label="Descrição" name="description" defaultValue={item?.description ?? ""} rows={2} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Categoria" name="category" defaultValue={item?.category ?? "regulamento"} options={Object.entries(DOCUMENT_CATEGORIES).map(([value, label]) => ({ value, label }))} />
            <TextField label="Data de publicação" name="published_on" type="date" defaultValue={item?.published_on ?? ""} />
          </div>
          <FileUpload name="file_url" label="Arquivo (PDF)" folder="documentos" defaultValue={item?.file_url} />
          <TextField label="Ou link externo" name="external_url" type="url" defaultValue={item?.external_url ?? ""} placeholder="https://" />
          <CheckboxField label="Publicado no site" name="is_published" defaultChecked={item ? item.is_published : true} />
        </FormSection>
        <div className="flex flex-wrap justify-between gap-3">
          <SubmitButton>Salvar</SubmitButton>
          {item ? <ConfirmAction action={deleteDocument.bind(null, item.id)} confirm="Excluir este documento?">Excluir</ConfirmAction> : null}
        </div>
      </ActionForm>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteNews, saveNews } from "@/actions/content";
import { ActionForm, ConfirmAction, FormSection, SelectField, SubmitButton, TextArea, TextField } from "@/components/admin/form";
import { AdminPageTitle } from "@/components/admin/page-title";
import { ImageUpload } from "@/components/admin/upload";
import { NEWS_CATEGORIES, type NewsItem } from "@/lib/data/content";
import { adminRow } from "@/lib/data/admin";
import { isoToZonedInput } from "@/lib/format";

export const metadata: Metadata = { title: "Publicação" };

export default async function AdminNewsEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = id === "novo" ? null : await adminRow<NewsItem>("news", id);
  if (id !== "novo" && !item) notFound();
  return (
    <>
      <AdminPageTitle
        title={item ? "Editar publicação" : "Nova publicação"}
        back={{ href: "/admin/noticias", label: "Notícias" }}
        actions={item?.status === "published" ? <Link href={`/noticias/${item.slug}`} target="_blank" className="btn-ghost btn-sm">Ver no site</Link> : null}
      />
      <ActionForm action={saveNews.bind(null, item?.id ?? null)} className="max-w-3xl space-y-6">
        <FormSection title="Conteúdo">
          <TextField label="Título" name="title" defaultValue={item?.title} required maxLength={160} />
          <TextField label="Subtítulo" name="subtitle" defaultValue={item?.subtitle ?? ""} maxLength={300} />
          <ImageUpload name="cover_url" label="Imagem de capa" folder="noticias" defaultValue={item?.cover_url} aspect="wide" hint="Também aparece no preview do WhatsApp." />
          <TextArea
            label="Texto"
            name="body"
            defaultValue={item?.body ?? ""}
            rows={14}
            hint="Parágrafos separados por linha em branco. ## Título, - lista, **negrito**, *itálico*, [texto](https://link)."
          />
        </FormSection>
        <FormSection title="Publicação">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Categoria" name="category" defaultValue={item?.category ?? "noticia"} options={Object.entries(NEWS_CATEGORIES).map(([value, label]) => ({ value, label }))} />
            <TextField label="Autor" name="author" defaultValue={item?.author ?? "Organização"} maxLength={80} />
            <TextField label="Data de publicação" name="published_at" type="datetime-local" defaultValue={isoToZonedInput(item?.published_at ?? null)} hint="Vazio = agora. Data futura agenda a publicação." />
            <SelectField
              label="Situação"
              name="status"
              defaultValue={item?.status ?? "published"}
              options={[
                { value: "published", label: "Publicada" },
                { value: "draft", label: "Rascunho (não aparece no site)" },
              ]}
            />
          </div>
          <TextField label="Endereço da página (opcional)" name="slug" defaultValue={item?.slug ?? ""} hint="Vazio = gerado pelo título" />
        </FormSection>
        <FormSection title="Links (opcional)">
          <TextField label="Link externo" name="external_url" type="url" defaultValue={item?.external_url ?? ""} placeholder="https://" />
          <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
            <TextField label="Texto do botão" name="cta_label" defaultValue={item?.cta_label ?? ""} maxLength={40} placeholder="Ex.: Inscreva-se" />
            <TextField label="Link do botão" name="cta_url" type="url" defaultValue={item?.cta_url ?? ""} placeholder="https://" />
          </div>
        </FormSection>
        <div className="flex flex-wrap justify-between gap-3">
          <SubmitButton>Salvar</SubmitButton>
          {item ? (
            <ConfirmAction action={deleteNews.bind(null, item.id)} confirm={`Excluir "${item.title}"?`}>
              Excluir
            </ConfirmAction>
          ) : null}
        </div>
      </ActionForm>
    </>
  );
}

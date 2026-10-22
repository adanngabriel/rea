import { ImageIcon, PlayCircle, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { addVideo, deleteAlbum, deleteGalleryItem, saveAlbum, setAlbumCover, updateGalleryItem } from "@/actions/content";
import { ActionForm, CheckboxField, ConfirmAction, FormSection, SelectField, SubmitButton, TextArea, TextField } from "@/components/admin/form";
import { AdminPageTitle } from "@/components/admin/page-title";
import { PhotoUploader } from "@/components/admin/photo-uploader";
import { ImageUpload } from "@/components/admin/upload";
import { GALLERY_CATEGORIES, type GalleryAlbum, type GalleryItem } from "@/lib/data/content";
import { adminRow } from "@/lib/data/admin";
import { serverClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Álbum" };

export default async function AdminAlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const album = id === "novo" ? null : await adminRow<GalleryAlbum>("gallery_albums", id);
  if (id !== "novo" && !album) notFound();
  let items: GalleryItem[] = [];
  if (album) {
    const db = await serverClient();
    const { data } = await db.from("gallery_items").select("*").eq("album_id", album.id).order("sort_order").order("created_at");
    items = (data ?? []) as GalleryItem[];
  }
  return (
    <>
      <AdminPageTitle title={album ? album.title : "Novo álbum"} back={{ href: "/admin/galeria", label: "Galeria" }} />
      <div className="max-w-5xl space-y-6">
        <ActionForm action={saveAlbum.bind(null, album?.id ?? null)} className="space-y-6">
          <FormSection title="Álbum">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Título" name="title" defaultValue={album?.title} required />
              <SelectField label="Categoria" name="category" defaultValue={album?.category ?? "outro"} options={Object.entries(GALLERY_CATEGORIES).map(([value, label]) => ({ value, label }))} />
              <TextField label="Data" name="event_date" type="date" defaultValue={album?.event_date ?? ""} />
              <TextField label="Ordem" name="sort_order" type="number" min={0} defaultValue={album?.sort_order ?? 0} />
            </div>
            <TextArea label="Descrição" name="description" defaultValue={album?.description ?? ""} rows={2} />
            <ImageUpload name="cover_url" label="Capa" folder="galeria" defaultValue={album?.cover_url} aspect="wide" hint="Se vazio, a primeira foto enviada vira a capa." />
            <CheckboxField label="Publicado no site" name="is_published" defaultChecked={album ? album.is_published : true} />
          </FormSection>
          <div className="flex flex-wrap justify-between gap-3">
            <SubmitButton>{album ? "Salvar álbum" : "Criar álbum e enviar fotos"}</SubmitButton>
            {album ? <ConfirmAction action={deleteAlbum.bind(null, album.id)} confirm="Excluir o álbum e todas as fotos dele?">Excluir álbum</ConfirmAction> : null}
          </div>
        </ActionForm>

        {album ? (
          <>
            <section className="card space-y-4 p-5">
              <h2 className="font-display text-xl font-extrabold uppercase">Fotos</h2>
              <PhotoUploader albumId={album.id} />
            </section>
            <section className="card p-5">
              <h2 className="mb-3 font-display text-xl font-extrabold uppercase">Vídeo por link</h2>
              <ActionForm action={addVideo.bind(null, album.id)} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]" resetOnSuccess success="Vídeo adicionado.">
                <TextField label="Link (YouTube, Instagram...)" name="url" type="url" placeholder="https://" />
                <TextField label="Legenda" name="caption" maxLength={200} />
                <SubmitButton className="btn-secondary">Adicionar</SubmitButton>
              </ActionForm>
            </section>
            <section>
              <h2 className="mb-3 font-display text-xl font-extrabold uppercase">Itens ({items.length})</h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <li key={item.id} className="card overflow-hidden">
                    {item.kind === "photo" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.url} alt={item.caption ?? ""} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                    ) : (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex aspect-[4/3] items-center justify-center gap-2 bg-surface-2 text-sm text-accent">
                        <PlayCircle className="size-6" aria-hidden /> Vídeo
                      </a>
                    )}
                    <div className="space-y-2 p-3">
                      <ActionForm action={updateGalleryItem.bind(null, item.id)} className="flex gap-2" success="Legenda salva.">
                        <label className="flex-1">
                          <span className="sr-only">Legenda</span>
                          <input name="caption" defaultValue={item.caption ?? ""} className="input py-1.5 text-sm" placeholder="Legenda" maxLength={200} />
                        </label>
                        <SubmitButton className="btn-ghost btn-sm">OK</SubmitButton>
                      </ActionForm>
                      <div className="flex gap-2">
                        {item.kind === "photo" ? (
                          <ConfirmAction action={setAlbumCover.bind(null, album.id, item.url)} className="btn-ghost btn-sm" success="Capa definida.">
                            <ImageIcon className="size-4" aria-hidden /> Usar como capa
                          </ConfirmAction>
                        ) : null}
                        <ConfirmAction action={deleteGalleryItem.bind(null, item.id)} className="btn-ghost btn-sm ml-auto" confirm="Remover este item?">
                          <Trash2 className="size-4" aria-hidden /> Remover
                        </ConfirmAction>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : null}
      </div>
    </>
  );
}

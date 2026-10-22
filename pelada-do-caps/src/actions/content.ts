"use server";

import { z } from "zod";
import { slugify, zonedInputToIso } from "@/lib/format";
import {
  adminAction,
  checkbox,
  idSchema,
  must,
  optionalDate,
  optionalText,
  optionalUrl,
  optionalUuid,
  parseForm,
  requiredText,
  storageUrl,
  uniqueSlug,
  UserError,
  type ActionContext,
  type ActionResult,
} from "./_lib";

async function remove(ctx: ActionContext, table: string, id: string, label: string, redirectTo?: string): Promise<ActionResult> {
  idSchema.parse(id);
  const row = must(await ctx.db.from(table).select("*").eq("id", id).single()) as { title?: string; name?: string };
  must(await ctx.db.from(table).delete().eq("id", id));
  await ctx.audit({ action: `${table}.delete`, entity: table, entityId: id, summary: `${label} excluído(a): ${row.title ?? row.name ?? id}`, before: row });
  return { ok: true, message: "Excluído.", redirectTo };
}

// ---------------- Notícias ----------------

const newsSchema = z
  .object({
    title: requiredText(160, "Informe o título"),
    subtitle: optionalText(300),
    cover_url: storageUrl,
    body: z.string().max(50000).transform((v) => v.trim()),
    category: z.enum(["noticia", "comunicado", "organizacao", "resultado", "sorteio"]),
    author: optionalText(80),
    status: z.enum(["draft", "published"]),
    published_at: z.string().transform((v, ctx) => {
      if (!v.trim()) return new Date().toISOString();
      try {
        return zonedInputToIso(v.trim());
      } catch {
        ctx.addIssue({ code: "custom", message: "Data inválida" });
        return z.NEVER;
      }
    }),
    external_url: optionalUrl,
    cta_label: optionalText(40),
    cta_url: optionalUrl,
    slug: optionalText(100),
  })
  .refine((n) => !n.cta_label === !n.cta_url, { message: "Preencha o texto e o link do botão", path: ["cta_url"] });

export async function saveNews(id: string | null, form: FormData): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    const ed = await ctx.edition();
    const { slug: requested, ...data } = parseForm(newsSchema, form);
    if (id) idSchema.parse(id);
    const slug = await uniqueSlug(ctx.db, "news", slugify(requested ?? "") || slugify(data.title), id);
    const row = { ...data, slug, edition_id: ed.id };
    const saved = must(
      id ? await ctx.db.from("news").update(row).eq("id", id).select("id").single() : await ctx.db.from("news").insert(row).select("id").single(),
    ) as { id: string };
    await ctx.audit({
      action: id ? "news.update" : "news.create",
      entity: "news",
      entityId: saved.id,
      summary: `Notícia "${data.title}" ${id ? "atualizada" : "criada"}${data.status === "published" ? " (publicada)" : " (rascunho)"}`,
    });
    return { ok: true, message: data.status === "published" ? "Notícia publicada." : "Rascunho salvo.", redirectTo: id ? undefined : `/admin/noticias/${saved.id}` };
  });
}

export async function deleteNews(id: string): Promise<ActionResult> {
  return adminAction((ctx) => remove(ctx, "news", id, "Notícia", "/admin/noticias"));
}

// ---------------- Na mídia ----------------

const pressSchema = z.object({
  title: requiredText(200, "Informe o título"),
  outlet: optionalText(80),
  image_url: storageUrl,
  summary: optionalText(500),
  url: optionalUrl.refine((v) => v !== null, "Informe o link da matéria"),
  published_on: optionalDate,
});

export async function savePress(id: string | null, form: FormData): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    const ed = await ctx.edition();
    const data = parseForm(pressSchema, form);
    if (id) idSchema.parse(id);
    must(id ? await ctx.db.from("press_links").update(data).eq("id", id) : await ctx.db.from("press_links").insert({ ...data, edition_id: ed.id }));
    await ctx.audit({ action: id ? "press.update" : "press.create", entity: "press_links", entityId: id, summary: `Matéria "${data.title}" ${id ? "atualizada" : "cadastrada"}` });
    return { ok: true, message: "Matéria salva.", redirectTo: "/admin/imprensa" };
  });
}

export async function deletePress(id: string): Promise<ActionResult> {
  return adminAction((ctx) => remove(ctx, "press_links", id, "Matéria", "/admin/imprensa"));
}

// ---------------- Documentos ----------------

const documentUrl = z.string().transform((v, ctx) => {
  const t = v.trim();
  if (!t) return null;
  if (!t.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/`)) {
    ctx.addIssue({ code: "custom", message: "Envie o arquivo pelo botão de upload" });
    return z.NEVER;
  }
  return t;
});

const documentSchema = z
  .object({
    title: requiredText(200, "Informe o título"),
    description: optionalText(500),
    category: z.enum(["regulamento", "edital", "comunicado", "tabela", "sumula", "disciplinar", "outro"]),
    file_url: documentUrl,
    external_url: optionalUrl,
    published_on: optionalDate.transform((v) => v ?? new Date().toISOString().slice(0, 10)),
    is_published: checkbox,
  })
  .refine((d) => d.file_url || d.external_url, { message: "Envie um arquivo ou informe um link", path: ["external_url"] });

export async function saveDocument(id: string | null, form: FormData): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    const ed = await ctx.edition();
    const data = parseForm(documentSchema, form);
    if (id) idSchema.parse(id);
    must(id ? await ctx.db.from("documents").update(data).eq("id", id) : await ctx.db.from("documents").insert({ ...data, edition_id: ed.id }));
    await ctx.audit({ action: id ? "document.update" : "document.create", entity: "documents", entityId: id, summary: `Documento "${data.title}" ${id ? "atualizado" : "publicado"}` });
    return { ok: true, message: "Documento salvo.", redirectTo: "/admin/documentos" };
  });
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  return adminAction((ctx) => remove(ctx, "documents", id, "Documento", "/admin/documentos"));
}

// ---------------- Galeria ----------------

const albumSchema = z.object({
  title: requiredText(120, "Informe o título"),
  description: optionalText(500),
  category: z.enum(["sorteio", "rodada-1", "rodada-2", "rodada-3", "final", "premiacao", "bastidores", "outro"]),
  cover_url: storageUrl,
  event_date: optionalDate,
  is_published: checkbox,
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
});

export async function saveAlbum(id: string | null, form: FormData): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    const ed = await ctx.edition();
    const data = parseForm(albumSchema, form);
    if (id) idSchema.parse(id);
    const saved = must(
      id
        ? await ctx.db.from("gallery_albums").update(data).eq("id", id).select("id").single()
        : await ctx.db.from("gallery_albums").insert({ ...data, edition_id: ed.id }).select("id").single(),
    ) as { id: string };
    await ctx.audit({ action: id ? "album.update" : "album.create", entity: "gallery_albums", entityId: saved.id, summary: `Álbum "${data.title}" ${id ? "atualizado" : "criado"}` });
    return { ok: true, message: "Álbum salvo.", redirectTo: id ? undefined : `/admin/galeria/${saved.id}` };
  });
}

export async function deleteAlbum(id: string): Promise<ActionResult> {
  return adminAction((ctx) => remove(ctx, "gallery_albums", id, "Álbum", "/admin/galeria"));
}

/** Fotos enviadas em lote (URLs já no Storage) para um álbum. */
export async function addPhotos(albumId: string, urls: string[]): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    idSchema.parse(albumId);
    const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/`;
    const clean = z.array(z.string().startsWith(base)).min(1).max(100).parse(urls);
    const { count } = await ctx.db.from("gallery_items").select("id", { count: "exact", head: true }).eq("album_id", albumId);
    must(await ctx.db.from("gallery_items").insert(clean.map((url, i) => ({ album_id: albumId, kind: "photo", url, sort_order: (count ?? 0) + i }))));
    const album = must(await ctx.db.from("gallery_albums").select("title, cover_url").eq("id", albumId).single()) as { title: string; cover_url: string | null };
    if (!album.cover_url) must(await ctx.db.from("gallery_albums").update({ cover_url: clean[0] }).eq("id", albumId));
    await ctx.audit({ action: "gallery.photos", entity: "gallery_items", entityId: albumId, summary: `${clean.length} foto(s) adicionada(s) ao álbum "${album.title}"` });
    return { ok: true, message: `${clean.length} foto(s) adicionada(s).` };
  });
}

const videoSchema = z.object({ url: optionalUrl.refine((v) => v !== null, "Informe o link do vídeo"), caption: optionalText(200) });

export async function addVideo(albumId: string, form: FormData): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    idSchema.parse(albumId);
    const data = parseForm(videoSchema, form);
    must(await ctx.db.from("gallery_items").insert({ album_id: albumId, kind: "video", url: data.url, caption: data.caption, sort_order: 999 }));
    await ctx.audit({ action: "gallery.video", entity: "gallery_items", entityId: albumId, summary: "Vídeo adicionado à galeria" });
    return { ok: true, message: "Vídeo adicionado." };
  });
}

export async function updateGalleryItem(id: string, form: FormData): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    idSchema.parse(id);
    const caption = optionalText(200).parse(String(form.get("caption") ?? ""));
    must(await ctx.db.from("gallery_items").update({ caption }).eq("id", id));
    return { ok: true, message: "Legenda salva." };
  });
}

export async function deleteGalleryItem(id: string): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    idSchema.parse(id);
    must(await ctx.db.from("gallery_items").delete().eq("id", id));
    await ctx.audit({ action: "gallery.delete", entity: "gallery_items", entityId: id, summary: "Item da galeria removido" });
    return { ok: true, message: "Item removido." };
  });
}

export async function setAlbumCover(albumId: string, url: string): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    idSchema.parse(albumId);
    const cover = storageUrl.parse(url);
    must(await ctx.db.from("gallery_albums").update({ cover_url: cover }).eq("id", albumId));
    return { ok: true, message: "Capa definida." };
  });
}

// ---------------- Premiações ----------------

const awardSchema = z
  .object({
    category: z.enum(["champion", "runner_up", "third_place", "top_scorer", "best_player", "best_goalkeeper", "round_highlight", "other"]),
    title: requiredText(80, "Informe o título do prêmio"),
    round_id: optionalUuid,
    team_id: optionalUuid,
    player_id: optionalUuid,
    description: optionalText(300),
    image_url: storageUrl,
    sort_order: z.coerce.number().int().min(0).max(999).default(0),
  })
  .refine((a) => a.team_id || a.player_id, { message: "Escolha um time ou um jogador", path: ["player_id"] })
  .refine((a) => !["champion", "runner_up", "third_place"].includes(a.category) || a.team_id, { message: "Escolha o time", path: ["team_id"] });

export async function saveAward(id: string | null, form: FormData): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    const ed = await ctx.edition();
    const data = parseForm(awardSchema, form);
    if (id) idSchema.parse(id);
    if (!id && (data.category === "champion" || data.category === "runner_up")) {
      const { count } = await ctx.db.from("awards").select("id", { count: "exact", head: true }).eq("edition_id", ed.id).eq("category", data.category);
      if (count) throw new UserError("Já existe esse título nesta edição. Edite o registro existente.");
    }
    must(id ? await ctx.db.from("awards").update(data).eq("id", id) : await ctx.db.from("awards").insert({ ...data, edition_id: ed.id }));
    await ctx.audit({ action: id ? "award.update" : "award.create", entity: "awards", entityId: id, summary: `Premiação "${data.title}" ${id ? "atualizada" : "registrada"}` });
    return { ok: true, message: "Premiação salva.", redirectTo: "/admin/premiacoes" };
  });
}

export async function deleteAward(id: string): Promise<ActionResult> {
  return adminAction((ctx) => remove(ctx, "awards", id, "Premiação", "/admin/premiacoes"));
}

// ---------------- Configurações do site e patrocinadores ----------------

const siteSchema = z.object({
  site_name: requiredText(120, "Informe o nome"),
  tagline: optionalText(120),
  site_url: optionalUrl,
  instagram_url: optionalUrl,
  whatsapp_url: optionalUrl,
  contact_email: optionalText(120).refine((v) => !v || z.email().safeParse(v).success, "E-mail inválido"),
  og_image_url: storageUrl,
});

export async function saveSiteSettings(form: FormData): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    const data = parseForm(siteSchema, form);
    must(await ctx.db.from("site_settings").upsert({ id: 1, ...data }));
    await ctx.audit({ action: "site.update", entity: "site_settings", summary: "Configurações do site atualizadas", after: data });
    return { ok: true, message: "Configurações salvas." };
  });
}

const sponsorSchema = z.object({
  name: requiredText(80, "Informe o nome"),
  logo_url: storageUrl,
  website_url: optionalUrl,
  tier: z.enum(["master", "patrocinio", "apoio"]),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
  active: checkbox,
});

export async function saveSponsor(id: string | null, form: FormData): Promise<ActionResult> {
  return adminAction(async (ctx) => {
    const data = parseForm(sponsorSchema, form);
    if (id) idSchema.parse(id);
    must(id ? await ctx.db.from("sponsors").update(data).eq("id", id) : await ctx.db.from("sponsors").insert(data));
    await ctx.audit({ action: id ? "sponsor.update" : "sponsor.create", entity: "sponsors", entityId: id, summary: `Apoiador ${data.name} ${id ? "atualizado" : "cadastrado"}` });
    return { ok: true, message: "Apoiador salvo." };
  });
}

export async function deleteSponsor(id: string): Promise<ActionResult> {
  return adminAction((ctx) => remove(ctx, "sponsors", id, "Apoiador"));
}

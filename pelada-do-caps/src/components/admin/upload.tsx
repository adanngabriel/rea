"use client";

import { FileText, ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useId, useRef, useState } from "react";
import { browserClient } from "@/lib/supabase/browser";
import { toast } from "./toast";

const MAX_DIMENSION = 1600;
const RASTER = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/** Reduz fotos grandes de celular antes do envio (economiza dados e espaço). */
async function shrinkImage(file: File, maxDimension: number): Promise<Blob> {
  if (!RASTER.includes(file.type)) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 900_000) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
  return blob && blob.size < file.size ? blob : file;
}

export async function uploadToStorage(file: File, bucket: "media" | "documents", folder: string, maxDimension = MAX_DIMENSION): Promise<string> {
  const supabase = browserClient();
  if (!supabase) throw new Error("Supabase não configurado.");
  const body = file.type.startsWith("image/") ? await shrinkImage(file, maxDimension) : file;
  const ext = body.type === "image/webp" ? "webp" : (file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin");
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType: body.type || file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(error.message.includes("mime") ? "Tipo de arquivo não permitido." : error.message.includes("size") ? "Arquivo grande demais." : error.message);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Campo de imagem com arrastar-e-soltar, pré-visualização e remoção. */
export function ImageUpload({
  name,
  label,
  defaultValue,
  folder,
  hint,
  aspect = "square",
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  folder: string;
  hint?: string;
  aspect?: "square" | "wide";
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("error", "Escolha uma imagem (JPG, PNG ou WEBP).");
      return;
    }
    setBusy(true);
    try {
      setUrl(await uploadToStorage(file, "media", folder));
    } catch (e) {
      toast("error", `Falha no envio: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <span className="field-label" id={`${id}-label`}>
        {label}
      </span>
      <input type="hidden" name={name} value={url} />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handle(e.dataTransfer.files[0]);
        }}
        className={`flex items-center gap-4 rounded-2xl border border-dashed p-3 transition-colors ${dragging ? "border-accent bg-accent/5" : "border-line-strong"}`}
      >
        <div className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-2 ${aspect === "wide" ? "h-20 w-32" : "size-20"}`}>
          {busy ? (
            <Loader2 className="size-6 animate-spin text-accent" aria-hidden />
          ) : url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Pré-visualização" className="size-full object-contain" />
          ) : (
            <ImagePlus className="size-6 text-subtle" aria-hidden />
          )}
        </div>
        <div className="flex flex-1 flex-wrap gap-2">
          <button type="button" className="btn-secondary btn-sm" onClick={() => input.current?.click()} disabled={busy} aria-describedby={`${id}-label`}>
            <UploadCloud className="size-4" aria-hidden />
            {url ? "Trocar" : "Enviar imagem"}
          </button>
          {url ? (
            <button type="button" className="btn-ghost btn-sm" onClick={() => setUrl("")} disabled={busy}>
              <Trash2 className="size-4" aria-hidden /> Remover
            </button>
          ) : null}
          <p className="w-full text-xs text-muted">{hint ?? "Arraste a imagem aqui ou toque em enviar. Fotos grandes são reduzidas automaticamente."}</p>
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="sr-only" tabIndex={-1} onChange={(e) => void handle(e.target.files?.[0])} />
      </div>
    </div>
  );
}

/** Campo de arquivo PDF/documento. */
export function FileUpload({ name, label, defaultValue, folder }: { name: string; label: string; defaultValue?: string | null; folder: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <span className="field-label">{label}</span>
      <input type="hidden" name={name} value={url} />
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-line-strong p-3">
        <FileText className="size-6 text-accent" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm text-muted">{url ? decodeURIComponent(url.split("/").pop() ?? "") : "Nenhum arquivo"}</span>
        <button type="button" className="btn-secondary btn-sm" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <UploadCloud className="size-4" aria-hidden />}
          {url ? "Trocar arquivo" : "Enviar PDF"}
        </button>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm">
            Abrir
          </a>
        ) : null}
        <input
          ref={input}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            try {
              setUrl(await uploadToStorage(file, "documents", folder, 2400));
            } catch (err) {
              toast("error", `Falha no envio: ${(err as Error).message}`);
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
    </div>
  );
}

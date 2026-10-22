"use client";

import { Loader2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { addPhotos } from "@/actions/content";
import { afterSave, runAction } from "./after-save";
import { toast } from "./toast";
import { uploadToStorage } from "./upload";

/** Envio de várias fotos de uma vez para um álbum. */
export function PhotoUploader({ albumId }: { albumId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const router = useRouter();
  const [, start] = useTransition();
  const [dragging, setDragging] = useState(false);
  const upload = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/")).slice(0, 100);
    if (!images.length) return;
    setProgress({ done: 0, total: images.length });
    const urls: string[] = [];
    for (const file of images) {
      try {
        urls.push(await uploadToStorage(file, "media", `galeria/${albumId}`));
      } catch (e) {
        toast("error", `${file.name}: ${(e as Error).message}`);
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }
    start(async () => {
      if (urls.length) {
        const result = await runAction(() => addPhotos(albumId, urls));
        toast(result.ok ? "success" : "error", result.ok ? (result.message ?? "Fotos adicionadas.") : result.error);
        if (result.ok) afterSave(router);
      }
      setProgress(null);
    });
  };
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void upload([...e.dataTransfer.files]);
      }}
      className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center ${dragging ? "border-accent bg-accent/5" : "border-line-strong"}`}
    >
      {progress ? (
        <>
          <Loader2 className="size-8 animate-spin text-accent" aria-hidden />
          <p className="text-sm" aria-live="polite">
            Enviando {progress.done} de {progress.total}…
          </p>
        </>
      ) : (
        <>
          <UploadCloud className="size-8 text-accent" aria-hidden />
          <p className="text-sm text-muted">Arraste as fotos aqui ou</p>
          <button type="button" className="btn-primary btn-sm" onClick={() => input.current?.click()}>
            Escolher fotos
          </button>
          <p className="text-xs text-subtle">As fotos são reduzidas automaticamente para carregar rápido no celular.</p>
        </>
      )}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          void upload([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

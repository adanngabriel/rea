"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

/** Compartilhar: usa o menu nativo do celular; no computador, abre o WhatsApp. */
export function ShareButton({ title, text, path, className = "btn-secondary btn-sm" }: { title: string; text?: string; path: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // cancelado pelo usuário
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text ?? title}\n${url}`)}`, "_blank", "noopener");
    }
  };
  return (
    <button type="button" onClick={share} className={className}>
      {copied ? <Check className="size-4" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
      {copied ? "Link copiado" : "Compartilhar"}
    </button>
  );
}

export function CopyTextButton({ text, label = "Copiar para WhatsApp" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="btn-primary"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? <Check className="size-4" aria-hidden /> : null}
        {copied ? "Copiado!" : label}
      </button>
      <a className="btn-secondary" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
        Abrir no WhatsApp
      </a>
    </div>
  );
}

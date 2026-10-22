"use client";

import type { useRouter } from "next/navigation";

/**
 * Depois de salvar: avisa o site público (em segundo plano) e atualiza a
 * tela do painel. O aviso de sucesso já foi mostrado antes disso.
 */
export function afterSave(router: ReturnType<typeof useRouter>, redirectTo?: string) {
  void fetch("/api/publicar", { method: "POST", keepalive: true }).catch(() => undefined);
  if (redirectTo) router.push(redirectTo);
  else router.refresh();
}

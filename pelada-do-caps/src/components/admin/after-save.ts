"use client";

import { unstable_isUnrecognizedActionError, type useRouter } from "next/navigation";
import type { ActionResult } from "@/actions/_lib";

/**
 * Depois de salvar: avisa o site público (em segundo plano) e atualiza a
 * tela do painel. O aviso de sucesso já foi mostrado antes disso.
 */
export function afterSave(router: ReturnType<typeof useRouter>, redirectTo?: string) {
  void fetch("/api/publicar", { method: "POST", keepalive: true }).catch(() => undefined);
  if (redirectTo) router.push(redirectTo);
  else router.refresh();
}

/**
 * Chama uma Server Action sem deixar uma falha de transporte derrubar a tela.
 * Se o site foi atualizado com o painel aberto, a página antiga não encontra
 * mais as ações do servidor: nada foi salvo e é preciso recarregar.
 */
export async function runAction(action: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await action();
  } catch (error) {
    if (unstable_isUnrecognizedActionError(error)) {
      return { ok: false, error: "O painel foi atualizado enquanto esta página estava aberta. Nada foi salvo: recarregue a página e tente de novo." };
    }
    console.error(error);
    return { ok: false, error: "Não foi possível falar com o servidor. Confira a internet e tente de novo." };
  }
}

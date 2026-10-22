import { revalidateTag } from "next/cache";
import { getAdmin } from "@/lib/auth";
import { PUBLIC_DATA_TAG } from "@/lib/supabase/public";

/**
 * Expira o cache das páginas públicas depois de uma alteração no painel.
 * Fica fora da Server Action para que o "Salvo" apareça assim que a escrita
 * termina, sem esperar a página ser montada de novo.
 */
export async function POST() {
  if (!(await getAdmin())) return new Response(null, { status: 401 });
  revalidateTag(PUBLIC_DATA_TAG, { expire: 0 });
  return new Response(null, { status: 204 });
}

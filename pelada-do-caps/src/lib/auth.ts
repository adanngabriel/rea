import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Edition } from "@/domain/types";
import { supabaseEnv } from "./supabase/env";
import { serverClient } from "./supabase/server";

export interface AdminSession {
  userId: string;
  email: string | null;
  /** Edição atual, trazida na mesma consulta que confirma o administrador. */
  edition: Edition | null;
}

/**
 * Usuário logado E cadastrado em public.admins, verificado no servidor.
 * O token de login é conferido localmente (chaves assimétricas do Supabase,
 * sem ida ao servidor de login); só a confirmação de administrador vai ao
 * banco, junto com a edição atual, numa única chamada.
 */
export const getAdmin = cache(async (): Promise<AdminSession | null> => {
  if (!supabaseEnv()) return null;
  const supabase = await serverClient();
  const { data: auth, error } = await supabase.auth.getClaims();
  const claims = auth?.claims;
  if (error || !claims?.sub) return null;
  const { data } = await supabase.rpc("admin_context");
  const ctx = data as { is_admin: boolean; edition: Edition | null } | null;
  if (ctx?.is_admin !== true) return null;
  return { userId: claims.sub, email: (claims.email as string | undefined) ?? null, edition: ctx.edition };
});

/** Para páginas do painel: redireciona ao login quando não autorizado. */
export async function requireAdminPage(): Promise<AdminSession> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { serverClient } from "./supabase/server";

export interface AdminSession {
  userId: string;
  email: string | null;
}

/** Usuário logado E cadastrado em public.admins; verificado no servidor. */
export const getAdmin = cache(async (): Promise<AdminSession | null> => {
  const supabase = await serverClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return null;
  return { userId: data.user.id, email: data.user.email ?? null };
});

/** Para páginas do painel: redireciona ao login quando não autorizado. */
export async function requireAdminPage(): Promise<AdminSession> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { serverClient } from "@/lib/supabase/server";
import { adminAction, type ActionResult } from "./_lib";

const loginSchema = z.object({
  email: z.email("Informe um e-mail válido").transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1, "Informe a senha"),
});

export async function signIn(form: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { ok: false, error: "Informe e-mail e senha." };
  const supabase = await serverClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: "E-mail ou senha incorretos." };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    await supabase.auth.signOut();
    return { ok: false, error: "Este usuário não tem acesso ao painel." };
  }
  return { ok: true, message: "Bem-vindo!", redirectTo: "/admin" };
}

export async function signOut(): Promise<void> {
  const supabase = await serverClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

const passwordSchema = z
  .object({
    password: z.string().min(10, "Use pelo menos 10 caracteres").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "As senhas não conferem", path: ["confirm"] });

export async function changePassword(form: FormData): Promise<ActionResult> {
  return adminAction(async ({ db, audit }) => {
    const { password } = passwordSchema.parse({ password: form.get("password"), confirm: form.get("confirm") });
    const { error } = await db.auth.updateUser({ password });
    if (error) return { ok: false, error: `Não foi possível alterar a senha: ${error.message}` };
    await audit({ action: "admin.password", entity: "admin", summary: "Senha do administrador alterada" });
    return { ok: true, message: "Senha alterada." };
  });
}

const firstAccessSchema = z
  .object({
    token: z.string().min(20).max(200),
    password: z.string().min(10, "Use pelo menos 10 caracteres").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "As senhas não conferem", path: ["confirm"] });

/** Primeiro acesso: o administrador define a própria senha com o código de uso único. */
export async function claimFirstAccess(form: FormData): Promise<ActionResult> {
  const parsed = firstAccessSchema.safeParse({ token: form.get("token"), password: form.get("password"), confirm: form.get("confirm") });
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message]));
    return { ok: false, error: "Confira os campos destacados.", fieldErrors };
  }
  const supabase = await serverClient();
  const { data: email, error } = await supabase.rpc("claim_admin_setup", { token: parsed.data.token, new_password: parsed.data.password });
  if (error || typeof email !== "string") {
    return { ok: false, error: error?.message.includes("expirado") ? "Este link já foi usado ou expirou." : "Não foi possível definir a senha." };
  }
  const login = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });
  if (login.error) return { ok: true, message: "Senha definida! Entre com seu e-mail e a nova senha.", redirectTo: "/admin/login" };
  return { ok: true, message: "Senha definida. Bem-vindo ao painel!", redirectTo: "/admin" };
}

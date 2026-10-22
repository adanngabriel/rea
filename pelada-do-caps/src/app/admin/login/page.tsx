import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signIn } from "@/actions/auth";
import { ActionForm, SubmitButton, TextField } from "@/components/admin/form";
import { Toaster } from "@/components/admin/toast";
import { BrandMark } from "@/components/public/brand";
import { getAdmin } from "@/lib/auth";
import { supabaseEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Entrar", robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (supabaseEnv() && (await getAdmin())) redirect("/admin");
  return (
    <main className="pitch-lines grid min-h-dvh place-items-center px-4 py-10">
      <div className="card w-full max-w-sm p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark size={56} />
          <h1 className="mt-4 font-display text-3xl font-extrabold uppercase">Painel da organização</h1>
          <p className="mt-1 text-sm text-muted">Acesso restrito aos administradores.</p>
        </div>
        {supabaseEnv() ? (
          <ActionForm action={signIn} success="Bem-vindo!">
            <TextField label="E-mail" name="email" type="email" autoComplete="username" required />
            <TextField label="Senha" name="password" type="password" autoComplete="current-password" required />
            <SubmitButton className="btn-primary w-full">Entrar</SubmitButton>
          </ActionForm>
        ) : (
          <p className="text-sm text-warning">Configure as variáveis do Supabase antes de entrar (veja docs/GUIA.md).</p>
        )}
      </div>
      <Toaster />
    </main>
  );
}

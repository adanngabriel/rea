import type { Metadata } from "next";
import { claimFirstAccess } from "@/actions/auth";
import { ActionForm, SubmitButton, TextField } from "@/components/admin/form";
import { Toaster } from "@/components/admin/toast";
import { BrandMark } from "@/components/public/brand";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Primeiro acesso", robots: { index: false, follow: false } };

export default async function FirstAccessPage({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const { codigo = "" } = await searchParams;
  return (
    <main className="pitch-lines grid min-h-dvh place-items-center px-4 py-10">
      <div className="card w-full max-w-sm p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark size={56} />
          <h1 className="mt-4 font-display text-3xl font-extrabold uppercase">Primeiro acesso</h1>
          <p className="mt-1 text-sm text-muted">Crie a senha do painel da organização. Este link funciona uma única vez.</p>
        </div>
        <ActionForm action={claimFirstAccess} success="Senha definida!">
          <input type="hidden" name="token" value={codigo} />
          <TextField label="Nova senha" name="password" type="password" autoComplete="new-password" minLength={10} hint="Pelo menos 10 caracteres" />
          <TextField label="Repita a senha" name="confirm" type="password" autoComplete="new-password" />
          <SubmitButton className="btn-primary w-full">Definir senha e entrar</SubmitButton>
        </ActionForm>
      </div>
      <Toaster />
    </main>
  );
}

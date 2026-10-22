import type { Metadata } from "next";
import { changePassword } from "@/actions/auth";
import { deleteSponsor, saveSiteSettings, saveSponsor } from "@/actions/content";
import { ActionForm, CheckboxField, ConfirmAction, FormSection, SelectField, SubmitButton, TextField } from "@/components/admin/form";
import { AdminPageTitle } from "@/components/admin/page-title";
import { ImageUpload } from "@/components/admin/upload";
import { DEFAULT_SITE, SPONSOR_TIERS, type SiteSettings, type Sponsor } from "@/lib/data/content";
import { adminRows } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const [sites, sponsors] = await Promise.all([
    adminRows<SiteSettings>("site_settings"),
    adminRows<Sponsor>("sponsors", [{ column: "sort_order" }, { column: "name" }]),
  ]);
  const site = sites[0] ?? DEFAULT_SITE;
  const tierOptions = Object.entries(SPONSOR_TIERS).map(([value, label]) => ({ value, label }));
  return (
    <>
      <AdminPageTitle title="Configurações" description="Identidade do site, redes sociais, patrocinadores e sua senha." />
      <div className="max-w-3xl space-y-6">
        <ActionForm action={saveSiteSettings} className="space-y-6" success="Configurações salvas.">
          <FormSection title="Identidade e contato">
            <TextField label="Nome do site" name="site_name" defaultValue={site.site_name} />
            <TextField label="Subtítulo" name="tagline" defaultValue={site.tagline ?? ""} placeholder="Inter Academy • 2026" />
            <TextField label="Endereço do site" name="site_url" type="url" defaultValue={site.site_url ?? ""} placeholder="https://peladadocaps.com" hint="Usado no QR Code e nos textos de compartilhamento." />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Instagram" name="instagram_url" type="url" defaultValue={site.instagram_url ?? ""} placeholder="https://instagram.com/..." />
              <TextField label="Grupo/contato WhatsApp" name="whatsapp_url" type="url" defaultValue={site.whatsapp_url ?? ""} placeholder="https://wa.me/55..." />
            </div>
            <TextField label="E-mail de contato" name="contact_email" type="email" defaultValue={site.contact_email ?? ""} />
            <ImageUpload name="og_image_url" label="Imagem padrão de compartilhamento (opcional)" folder="identidade" defaultValue={site.og_image_url} aspect="wide" hint="Se vazio, o site gera uma automaticamente." />
          </FormSection>
          <SubmitButton>Salvar</SubmitButton>
        </ActionForm>

        <section className="card space-y-4 p-5 sm:p-6">
          <h2 className="font-display text-xl font-extrabold uppercase">Patrocinadores e apoiadores</h2>
          <p className="text-sm text-muted">Aparecem no rodapé de todas as páginas.</p>
          <ul className="space-y-3">
            {sponsors.map((sp) => (
              <li key={sp.id} className="rounded-2xl border border-line p-4">
                <ActionForm action={saveSponsor.bind(null, sp.id)} className="space-y-3" success="Apoiador salvo.">
                  <div className="grid gap-3 sm:grid-cols-[1fr_10rem_6rem]">
                    <TextField label="Nome" name="name" defaultValue={sp.name} />
                    <SelectField label="Cota" name="tier" defaultValue={sp.tier} options={tierOptions} />
                    <TextField label="Ordem" name="sort_order" type="number" min={0} defaultValue={sp.sort_order} />
                  </div>
                  <TextField label="Site" name="website_url" type="url" defaultValue={sp.website_url ?? ""} />
                  <ImageUpload name="logo_url" label="Logo" folder="apoiadores" defaultValue={sp.logo_url} />
                  <CheckboxField label="Exibir no site" name="active" defaultChecked={sp.active} />
                  <div className="flex gap-2">
                    <SubmitButton className="btn-secondary btn-sm">Salvar</SubmitButton>
                    <ConfirmAction action={deleteSponsor.bind(null, sp.id)} className="btn-ghost btn-sm" confirm={`Remover ${sp.name}?`}>
                      Remover
                    </ConfirmAction>
                  </div>
                </ActionForm>
              </li>
            ))}
          </ul>
          <ActionForm action={saveSponsor.bind(null, null)} className="space-y-3 rounded-2xl border border-dashed border-line-strong p-4" resetOnSuccess success="Apoiador cadastrado.">
            <p className="font-semibold">Novo apoiador</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_10rem_6rem]">
              <TextField label="Nome" name="name" />
              <SelectField label="Cota" name="tier" defaultValue="apoio" options={tierOptions} />
              <TextField label="Ordem" name="sort_order" type="number" min={0} defaultValue={sponsors.length + 1} />
            </div>
            <TextField label="Site" name="website_url" type="url" placeholder="https://" />
            <ImageUpload name="logo_url" label="Logo" folder="apoiadores" />
            <input type="hidden" name="active" value="on" />
            <SubmitButton className="btn-primary btn-sm">Adicionar</SubmitButton>
          </ActionForm>
        </section>

        <ActionForm action={changePassword} resetOnSuccess success="Senha alterada.">
          <FormSection title="Alterar minha senha">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Nova senha" name="password" type="password" autoComplete="new-password" minLength={10} />
              <TextField label="Confirmar nova senha" name="confirm" type="password" autoComplete="new-password" />
            </div>
            <SubmitButton className="btn-secondary">Alterar senha</SubmitButton>
          </FormSection>
        </ActionForm>
      </div>
    </>
  );
}

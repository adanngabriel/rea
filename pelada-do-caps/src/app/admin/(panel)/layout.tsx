import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/actions/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { Toaster } from "@/components/admin/toast";
import { BrandMark } from "@/components/public/brand";
import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Painel", template: "%s • Painel" }, robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  const brand = (
    <Link href="/admin" className="flex items-center gap-2">
      <BrandMark size={32} />
      <span className="font-display text-lg font-extrabold uppercase leading-none">
        Pelada do Caps
        <span className="block text-[0.65rem] font-semibold tracking-[0.2em] text-accent">Painel</span>
      </span>
    </Link>
  );
  return (
    <>
      <AdminShell brand={brand} email={admin.email} signOut={signOut}>
        {children}
      </AdminShell>
      <Toaster />
    </>
  );
}

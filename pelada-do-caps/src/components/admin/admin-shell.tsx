"use client";

import { ExternalLink, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ADMIN_NAV } from "./admin-nav";

function NavList({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Painel" className="space-y-6">
      {ADMIN_NAV.map((group) => (
        <div key={group.title}>
          <p className="eyebrow mb-2 px-3">{group.title}</p>
          <ul className="space-y-0.5">
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-ink aria-[current=page]:bg-accent/10 aria-[current=page]:font-semibold aria-[current=page]:text-accent"
                  >
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({
  children,
  brand,
  email,
  signOut,
}: {
  children: React.ReactNode;
  brand: React.ReactNode;
  email: string | null;
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const footer = (
    <div className="space-y-2 border-t border-line pt-4">
      <Link href="/" target="_blank" className="flex items-center gap-2 px-3 text-sm text-muted hover:text-ink">
        <ExternalLink className="size-4" aria-hidden /> Ver site público
      </Link>
      <form action={signOut}>
        <button type="submit" className="flex w-full items-center gap-2 px-3 py-1 text-sm text-muted hover:text-danger">
          <LogOut className="size-4" aria-hidden /> Sair
        </button>
      </form>
      {email ? <p className="truncate px-3 text-xs text-subtle">{email}</p> : null}
    </div>
  );
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 overflow-y-auto border-r border-line bg-surface p-4 lg:flex">
        {brand}
        <div className="flex-1">
          <NavList pathname={pathname} />
        </div>
        {footer}
      </aside>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur lg:hidden">
        {brand}
        <button type="button" className="btn-ghost -mr-2 px-3" onClick={() => setOpen(true)} aria-expanded={open}>
          <Menu className="size-5" aria-hidden />
          <span className="sr-only">Abrir menu do painel</span>
        </button>
      </header>
      {open ? (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Menu do painel">
          <button type="button" className="flex-1 bg-black/60" aria-label="Fechar menu" onClick={() => setOpen(false)} />
          <div className="flex w-72 flex-col gap-6 overflow-y-auto border-l border-line bg-surface p-4">
            <button type="button" className="btn-ghost self-end px-3" onClick={() => setOpen(false)} autoFocus>
              <X className="size-5" aria-hidden />
              <span className="sr-only">Fechar</span>
            </button>
            <div className="flex-1">
              <NavList pathname={pathname} />
            </div>
            {footer}
          </div>
        </div>
      ) : null}
      <main id="conteudo" className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">
        {children}
      </main>
    </div>
  );
}

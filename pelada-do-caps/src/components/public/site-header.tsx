"use client";

import { CalendarDays, Home, Menu, Table2, Trophy, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isActive, MORE_NAV, PRIMARY_NAV } from "./nav-items";

export function SiteHeader({ brand }: { brand: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <a href="#conteudo" className="sr-only z-50 rounded bg-accent px-3 py-2 text-accent-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          {brand}
          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {PRIMARY_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(pathname, item.href) ? "page" : undefined}
                    className="rounded-full px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-ink aria-[current=page]:bg-surface-2 aria-[current=page]:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <button
            type="button"
            className="btn-ghost -mr-2 px-3"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="menu-completo"
          >
            <Menu className="size-5" aria-hidden />
            <span className="hidden sm:inline">Menu</span>
            <span className="sr-only sm:hidden">Abrir menu</span>
          </button>
        </div>
      </header>

      {open ? (
        <div id="menu-completo" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 flex flex-col bg-bg/98 backdrop-blur">
          <div className="container-page flex h-16 items-center justify-between">
            {brand}
            <button type="button" className="btn-ghost -mr-2 px-3" onClick={() => setOpen(false)} autoFocus>
              <X className="size-5" aria-hidden />
              <span className="sr-only">Fechar menu</span>
            </button>
          </div>
          <nav aria-label="Menu completo" className="container-page flex-1 overflow-y-auto pb-24 pt-4">
            <ul className="grid gap-1 sm:grid-cols-2">
              {[...PRIMARY_NAV, ...MORE_NAV].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(pathname, item.href) ? "page" : undefined}
                    className="block rounded-2xl px-4 py-3.5 font-display text-2xl font-bold uppercase tracking-wide text-ink/90 hover:bg-surface-2 aria-[current=page]:text-accent"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      ) : null}

      <nav
        aria-label="Atalhos"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {[
            { href: "/", label: "Início", icon: Home },
            { href: "/jogos", label: "Jogos", icon: CalendarDays },
            { href: "/classificacao", label: "Tabela", icon: Table2 },
            { href: "/estatisticas", label: "Destaques", icon: Trophy },
          ].map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive(pathname, href) ? "page" : undefined}
                className="flex flex-col items-center gap-1 py-2.5 text-[0.68rem] font-medium text-muted aria-[current=page]:text-accent"
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex w-full flex-col items-center gap-1 py-2.5 text-[0.68rem] font-medium text-muted"
            >
              <Menu className="size-5" aria-hidden />
              Mais
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}

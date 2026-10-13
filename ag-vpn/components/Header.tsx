"use client";

import { useState } from "react";
import { Logo } from "./Logo";

const links = [
  { href: "#recursos", label: "Recursos" },
  { href: "#plataformas", label: "Plataformas" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#planos", label: "Planos" },
  { href: "#faq", label: "Dúvidas" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="header">
      <div className="container header-inner">
        <a href="#" aria-label="AG VPN — início">
          <Logo />
        </a>
        <nav className={`nav ${open ? "nav-open" : ""}`} aria-label="Principal">
          {links.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <a href="#download" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>
            Baixar grátis
          </a>
        </nav>
        <button
          className="menu-toggle"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}

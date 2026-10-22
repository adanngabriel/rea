export interface NavItem {
  href: string;
  label: string;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Início" },
  { href: "/jogos", label: "Jogos" },
  { href: "/classificacao", label: "Classificação" },
  { href: "/times", label: "Times" },
  { href: "/estatisticas", label: "Destaques" },
  { href: "/mata-mata", label: "Mata-mata" },
  { href: "/noticias", label: "Notícias" },
];

export const MORE_NAV: NavItem[] = [
  { href: "/jogadores", label: "Jogadores" },
  { href: "/cartoes", label: "Cartões e suspensões" },
  { href: "/sorteio", label: "Sorteio dos times" },
  { href: "/documentos", label: "Regulamento e documentos" },
  { href: "/galeria", label: "Galeria" },
  { href: "/na-midia", label: "Na mídia" },
  { href: "/campeao", label: "Campeão" },
  { href: "/campeoes", label: "Hall dos campeões" },
  { href: "/sobre", label: "Sobre o torneio" },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

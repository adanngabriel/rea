import {
  BookOpen,
  CalendarDays,
  Flag,
  GitBranch,
  Home,
  Images,
  Info,
  Medal,
  Newspaper,
  Radio,
  Shield,
  Shirt,
  Square,
  Table2,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Início", icon: Home },
  { href: "/jogos", label: "Jogos", icon: CalendarDays },
  { href: "/classificacao", label: "Classificação", icon: Table2 },
  { href: "/times", label: "Times", icon: Shield },
  { href: "/estatisticas", label: "Destaques", icon: Trophy },
  { href: "/mata-mata", label: "Mata-mata", icon: GitBranch },
  { href: "/noticias", label: "Notícias", icon: Newspaper },
];

export const MORE_NAV: NavItem[] = [
  { href: "/jogadores", label: "Jogadores", icon: Users },
  { href: "/cartoes", label: "Cartões e suspensões", icon: Square },
  { href: "/sorteio", label: "Sorteio dos times", icon: Shirt },
  { href: "/documentos", label: "Regulamento e documentos", icon: BookOpen },
  { href: "/galeria", label: "Galeria", icon: Images },
  { href: "/na-midia", label: "Na mídia", icon: Radio },
  { href: "/campeao", label: "Campeão e premiações", icon: Flag },
  { href: "/campeoes", label: "Hall dos campeões", icon: Medal },
  { href: "/sobre", label: "Sobre o torneio", icon: Info },
];

/** Atalhos da barra inferior do celular (o 5º botão abre o menu completo). */
export const BOTTOM_NAV: NavItem[] = [
  { href: "/", label: "Início", icon: Home },
  { href: "/jogos", label: "Jogos", icon: CalendarDays },
  { href: "/classificacao", label: "Tabela", icon: Table2 },
  { href: "/estatisticas", label: "Destaques", icon: Trophy },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

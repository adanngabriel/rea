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
  { href: "/premiacoes", label: "Premiações", icon: Medal },
  { href: "/noticias", label: "Notícias", icon: Newspaper },
];

/** Menu completo, em grupos curtos (também usado no rodapé). */
export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Campeonato",
    items: [
      { href: "/jogos", label: "Jogos", icon: CalendarDays },
      { href: "/classificacao", label: "Classificação", icon: Table2 },
      { href: "/mata-mata", label: "Mata-mata", icon: GitBranch },
      { href: "/times", label: "Times", icon: Shield },
      { href: "/jogadores", label: "Jogadores", icon: Users },
      { href: "/sorteio", label: "Sorteio dos times", icon: Shirt },
    ],
  },
  {
    title: "Destaques",
    items: [
      { href: "/estatisticas", label: "Artilharia e destaques", icon: Trophy },
      { href: "/premiacoes", label: "Premiações", icon: Medal },
      { href: "/cartoes", label: "Cartões e suspensões", icon: Square },
    ],
  },
  {
    title: "Informações",
    items: [
      { href: "/documentos", label: "Regulamento e documentos", icon: BookOpen },
      { href: "/noticias", label: "Notícias", icon: Newspaper },
      { href: "/galeria", label: "Galeria de fotos", icon: Images },
      { href: "/na-midia", label: "Na mídia", icon: Radio },
      { href: "/campeoes", label: "Hall dos campeões", icon: Flag },
      { href: "/sobre", label: "Sobre o torneio", icon: Info },
    ],
  },
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

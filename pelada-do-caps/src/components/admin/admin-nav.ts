import {
  Award,
  BarChart3,
  CalendarDays,
  ClipboardList,
  Cog,
  FileText,
  GitBranch,
  History,
  Images,
  LayoutDashboard,
  Newspaper,
  Share2,
  Shield,
  Shuffle,
  Square,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const ADMIN_NAV: { title: string; items: AdminNavItem[] }[] = [
  {
    title: "Geral",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/campeonato", label: "Campeonato", icon: Trophy },
    ],
  },
  {
    title: "Competição",
    items: [
      { href: "/admin/times", label: "Times", icon: Shield },
      { href: "/admin/jogadores", label: "Jogadores", icon: Users },
      { href: "/admin/sorteio", label: "Montagem dos times", icon: Shuffle },
      { href: "/admin/jogos", label: "Jogos e súmulas", icon: CalendarDays },
      { href: "/admin/classificacao", label: "Classificação", icon: BarChart3 },
      { href: "/admin/mata-mata", label: "Mata-mata", icon: GitBranch },
      { href: "/admin/disciplina", label: "Cartões e suspensões", icon: Square },
      { href: "/admin/premiacoes", label: "Premiações", icon: Award },
    ],
  },
  {
    title: "Conteúdo",
    items: [
      { href: "/admin/noticias", label: "Notícias", icon: Newspaper },
      { href: "/admin/imprensa", label: "Na mídia", icon: ClipboardList },
      { href: "/admin/documentos", label: "Documentos", icon: FileText },
      { href: "/admin/galeria", label: "Galeria", icon: Images },
    ],
  },
  {
    title: "Ferramentas",
    items: [
      { href: "/admin/exportacoes", label: "Exportações", icon: Share2 },
      { href: "/admin/auditoria", label: "Histórico de alterações", icon: History },
      { href: "/admin/configuracoes", label: "Configurações", icon: Cog },
    ],
  },
];

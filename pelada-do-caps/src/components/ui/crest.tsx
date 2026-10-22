import Image from "next/image";
import type { Team } from "@/domain/types";

function initials(team: Pick<Team, "name" | "short_name">): string {
  if (team.short_name) return team.short_name.slice(0, 3).toUpperCase();
  const words = team.name.split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.map((w) => w[0]).join("") : team.name.slice(0, 2)).slice(0, 3).toUpperCase();
}

/** Escudo do time; sem imagem cadastrada, desenha um escudo com as cores do time. */
export function Crest({
  team,
  size = 40,
  className = "",
  priority = false,
}: {
  team: Pick<Team, "name" | "short_name" | "crest_url" | "primary_color" | "secondary_color"> | null;
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  const style = { width: size, height: size };
  if (team?.crest_url) {
    return (
      <Image
        src={team.crest_url}
        alt={`Escudo do ${team.name}`}
        width={size}
        height={size}
        priority={priority}
        className={`shrink-0 object-contain ${className}`}
        style={style}
      />
    );
  }
  const primary = team?.primary_color ?? "#31443a";
  const secondary = team?.secondary_color ?? "#9aaba1";
  return (
    <svg
      viewBox="0 0 40 46"
      style={style}
      className={`shrink-0 ${className}`}
      role="img"
      aria-label={team ? `Escudo do ${team.name}` : "Time a definir"}
    >
      <path d="M20 1 37 7v15c0 11-7.5 19-17 23C10.5 41 3 33 3 22V7Z" fill={primary} stroke={secondary} strokeWidth="2" />
      <path d="M20 1 37 7v15c0 11-7.5 19-17 23Z" fill="#000" opacity="0.12" />
      <text
        x="20"
        y="27"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontWeight="800"
        fontSize={team ? 13 : 18}
        fill={secondary}
      >
        {team ? initials(team) : "?"}
      </text>
    </svg>
  );
}

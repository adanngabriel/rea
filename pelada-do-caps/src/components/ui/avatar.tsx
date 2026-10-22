import Image from "next/image";
import type { Player } from "@/domain/types";

export function PlayerAvatar({
  player,
  size = 40,
  ring,
  className = "",
}: {
  player: Pick<Player, "name" | "nickname" | "photo_url">;
  size?: number;
  ring?: string;
  className?: string;
}) {
  const style = { width: size, height: size, boxShadow: ring ? `0 0 0 2px ${ring}` : undefined };
  if (player.photo_url) {
    return (
      <Image
        src={player.photo_url}
        alt={`Foto de ${player.name}`}
        width={size}
        height={size}
        className={`shrink-0 rounded-full bg-surface-3 object-cover ${className}`}
        style={style}
      />
    );
  }
  const label = (player.nickname || player.name)
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full bg-surface-3 font-display font-bold text-muted ${className}`}
      style={{ ...style, fontSize: size * 0.38 }}
    >
      {label}
    </span>
  );
}

"use client";

import Image from "next/image";
import { useState } from "react";

/** Imagem do escudo; se o arquivo não carregar, mostra o escudo desenhado. */
export function CrestImage({ src, alt, size, priority, className, fallback }: { src: string; alt: string; size: number; priority?: boolean; className: string; fallback: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={className}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}

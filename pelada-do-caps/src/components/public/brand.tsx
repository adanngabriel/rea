import Image from "next/image";
import Link from "next/link";

/** Marca do torneio: logo enviado no painel ou o selo padrão. */
export function BrandMark({ logoUrl, size = 40 }: { logoUrl?: string | null; size?: number }) {
  if (logoUrl) {
    return <Image src={logoUrl} alt="" width={size} height={size} className="shrink-0 object-contain" style={{ width: size, height: size }} priority />;
  }
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden className="shrink-0">
      <circle cx="24" cy="24" r="22" fill="#0a1324" stroke="#4aa6ef" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="16" fill="none" stroke="#4aa6ef" strokeOpacity=".25" strokeWidth="1" />
      <text x="24" y="30.5" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="18" fill="#eef3fb">
        PC
      </text>
      <path d="M24 4.5l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.2-2.4 1.2.5-2.6-1.9-1.8 2.6-.4z" fill="#f5c84b" />
    </svg>
  );
}

export function Brand({ name, tagline, logoUrl }: { name: string; tagline?: string | null; logoUrl?: string | null }) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label={`${name} — página inicial`}>
      <BrandMark logoUrl={logoUrl} size={36} />
      <span className="min-w-0 leading-none">
        <span className="block truncate font-display text-base font-extrabold uppercase tracking-wide sm:text-xl">{name}</span>
        {tagline ? <span className="block truncate text-[0.7rem] uppercase tracking-[0.16em] text-muted">{tagline}</span> : null}
      </span>
    </Link>
  );
}

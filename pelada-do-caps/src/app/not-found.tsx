import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <p className="font-display text-7xl font-extrabold text-accent">404</p>
        <p className="mt-2 text-muted">Página não encontrada.</p>
        <Link href="/" className="btn-primary mt-6">
          Ir para o início
        </Link>
      </div>
    </main>
  );
}

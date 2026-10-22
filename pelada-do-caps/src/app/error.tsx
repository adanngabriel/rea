"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-[60vh] place-items-center p-6 text-center">
      <div>
        <p className="font-display text-4xl font-extrabold uppercase">Algo deu errado</p>
        <p className="mt-2 text-muted">Não conseguimos carregar esta página agora. Tente novamente em instantes.</p>
        <button type="button" onClick={reset} className="btn-primary mt-6">
          Tentar novamente
        </button>
      </div>
    </main>
  );
}

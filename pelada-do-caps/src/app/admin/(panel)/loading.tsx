/** Aparece na hora em que se clica no menu do painel, enquanto a página carrega. */
export default function AdminLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Carregando">
      <div className="h-9 w-56 animate-pulse rounded-xl bg-surface-2" />
      <div className="h-4 w-80 max-w-full animate-pulse rounded bg-surface-2" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-[var(--radius-card)] bg-surface" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-[var(--radius-card)] bg-surface" />
    </div>
  );
}

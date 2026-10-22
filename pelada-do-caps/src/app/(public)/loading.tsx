export default function Loading() {
  return (
    <div className="container-page space-y-4 py-10" aria-busy="true" aria-label="Carregando">
      <div className="h-10 w-2/3 animate-pulse rounded-xl bg-surface-2" />
      <div className="h-48 animate-pulse rounded-[var(--radius-card)] bg-surface" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-[var(--radius-card)] bg-surface" />
        ))}
      </div>
    </div>
  );
}

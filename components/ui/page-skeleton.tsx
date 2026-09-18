export function PageSkeleton() {
  return <div role="status" aria-label="Loading page" className="mx-auto max-w-6xl space-y-8 py-2">
    <span className="sr-only">Loading your workspace…</span>
    <div className="space-y-3"><div className="h-9 w-52 animate-pulse rounded-lg bg-muted"/><div className="h-4 w-3/4 max-w-md animate-pulse rounded bg-muted"/></div>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0,1,2,3].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl border bg-card"/>)}</div>
    <div className="space-y-4 rounded-2xl border bg-card p-6">{[0,1,2,3].map(i => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/60"/>)}</div>
  </div>;
}

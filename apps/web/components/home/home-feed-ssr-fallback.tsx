/**
 * Shell tĩnh cho SSR/hydrate — khớp bố cục `HomeFeed`, không gọi `useSession`.
 */
export function HomeFeedSsrFallback() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col px-4 py-10">
      <div className="mb-8 space-y-2">
        <div className="h-8 w-32 rounded bg-muted/50" aria-hidden />
        <div className="h-4 w-full max-w-md rounded bg-muted/40" aria-hidden />
      </div>
      <div className="mb-8 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
        <div className="mb-4 h-3 w-40 rounded bg-muted/50" aria-hidden />
        <div className="mb-4 h-24 w-full rounded-lg bg-muted/40" aria-hidden />
        <div className="flex justify-end">
          <div className="h-9 w-20 rounded-full bg-muted/50" aria-hidden />
        </div>
      </div>
      <div className="h-4 w-36 rounded bg-muted/40" aria-hidden />
    </div>
  );
}

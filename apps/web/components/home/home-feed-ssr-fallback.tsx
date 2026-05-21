/**
 * Shell tĩnh cho SSR/hydrate — khớp bố cục `HomeFeed`, không gọi `useSession`.
 */
export function HomeFeedSsrFallback() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col px-4 py-10">
      <div className="mb-8 space-y-2">
        <div className="bg-muted/50 h-8 w-32 rounded" aria-hidden />
        <div className="bg-muted/40 h-4 w-full max-w-md rounded" aria-hidden />
      </div>
      <div className="border-border bg-card mb-8 rounded-[var(--radius)] border p-4 shadow-sm">
        <div className="bg-muted/50 mb-4 h-3 w-40 rounded" aria-hidden />
        <div className="bg-muted/40 mb-4 h-24 w-full rounded-lg" aria-hidden />
        <div className="flex justify-end">
          <div className="bg-muted/50 h-9 w-20 rounded-full" aria-hidden />
        </div>
      </div>
      <div className="bg-muted/40 h-4 w-36 rounded" aria-hidden />
    </div>
  );
}

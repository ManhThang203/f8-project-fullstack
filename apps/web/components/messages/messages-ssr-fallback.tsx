/**
 * Shell tĩnh SSR cho `/messages` — khớp bố cục MessagesView (cột trái + khu chat).
 */
export function MessagesSsrFallback() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-5xl flex-col gap-0 md:flex-row md:border-x md:border-border">
      <aside className="flex w-full flex-col border-b border-border md:w-72 md:border-b-0 md:border-r md:border-border">
        <div className="flex items-center justify-between gap-2 border-b border-border p-3">
          <div className="h-4 w-24 rounded bg-muted/60" aria-hidden />
          <div className="h-11 w-11 rounded-full bg-muted/60" aria-hidden />
        </div>
        <div className="space-y-2 p-3">
          <div className="h-14 rounded-xl bg-muted/50" aria-hidden />
          <div className="h-14 rounded-xl bg-muted/50" aria-hidden />
          <div className="h-14 rounded-xl bg-muted/50" aria-hidden />
        </div>
      </aside>
      <section className="min-h-[50dvh] flex-1 border-b border-border md:border-b-0">
        <div className="border-b border-border px-4 py-3">
          <div className="h-4 w-32 rounded bg-muted/60" aria-hidden />
        </div>
        <div className="flex min-h-[12rem] flex-col justify-end gap-2 p-4">
          <div className="h-20 rounded-2xl bg-muted/40" aria-hidden />
        </div>
      </section>
    </div>
  );
}

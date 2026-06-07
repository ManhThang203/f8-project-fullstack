/**
 * Shell tĩnh SSR cho `/messages` — khớp bố cục MessagesView (cột trái + khu chat).
 */
export function MessagesSsrFallback() {
  return (
    <div className="md:border-border mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-5xl flex-col gap-0 md:flex-row md:border-x">
      <aside className="border-border md:border-border flex w-full flex-col border-b md:w-72 md:border-b-0 md:border-r">
        <div className="border-border flex items-center justify-between gap-2 border-b p-3">
          <div className="bg-muted/60 h-4 w-24 rounded" aria-hidden />
          <div className="bg-muted/60 h-11 w-11 rounded-full" aria-hidden />
        </div>
        <div className="space-y-2 p-3">
          <div className="bg-muted/50 h-14 rounded-xl" aria-hidden />
          <div className="bg-muted/50 h-14 rounded-xl" aria-hidden />
          <div className="bg-muted/50 h-14 rounded-xl" aria-hidden />
        </div>
      </aside>
      <section className="border-border min-h-[50dvh] flex-1 border-b md:border-b-0">
        <div className="border-border border-b px-4 py-3">
          <div className="bg-muted/60 h-4 w-32 rounded" aria-hidden />
        </div>
        <div className="flex min-h-[12rem] flex-col justify-end gap-2 p-4">
          <div className="bg-muted/40 h-20 rounded-2xl" aria-hidden />
        </div>
      </section>
    </div>
  );
}

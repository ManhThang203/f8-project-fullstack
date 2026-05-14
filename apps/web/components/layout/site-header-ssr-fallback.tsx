/**
 * Shell tĩnh cho SSR/hydrate — khớp bố cục 3 cột `SiteHeader` (trái / giữa / phải).
 */
export function SiteHeaderSsrFallback() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-2 px-3 sm:gap-4 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <div className="h-6 w-20 shrink-0 rounded bg-muted/50" aria-hidden />
          <div className="h-10 min-w-0 flex-1 max-w-xs rounded-full bg-muted/50" aria-hidden />
        </div>
        <div className="flex shrink-0 gap-1 sm:gap-2" aria-hidden>
          <div className="h-11 w-11 rounded-lg bg-muted/50" />
          <div className="h-11 w-11 rounded-lg bg-muted/50" />
          <div className="h-11 w-11 rounded-lg bg-muted/50" />
        </div>
        <div className="flex min-w-0 flex-1 justify-end gap-1 sm:gap-2" aria-hidden>
          <div className="h-11 w-11 rounded-full bg-muted/50" />
          <div className="h-11 w-11 rounded-full bg-muted/50" />
          <div className="h-11 w-11 rounded-full bg-muted/50" />
          <div className="h-11 w-11 rounded-full bg-muted/50" />
        </div>
      </div>
    </header>
  );
}

/**
 * Shell tĩnh cho SSR/hydrate — khớp bố cục 3 cột `SiteHeader` (trái / giữa / phải).
 */
export function SiteHeaderSsrFallback() {
  return (
    <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-50 border-b backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-2 px-3 sm:gap-4 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <div className="bg-muted/50 h-6 w-20 shrink-0 rounded" aria-hidden />
          <div className="bg-muted/50 h-10 min-w-0 max-w-xs flex-1 rounded-full" aria-hidden />
        </div>
        <div className="flex shrink-0 gap-1 sm:gap-2" aria-hidden>
          <div className="bg-muted/50 h-11 w-11 rounded-lg" />
          <div className="bg-muted/50 h-11 w-11 rounded-lg" />
          <div className="bg-muted/50 h-11 w-11 rounded-lg" />
        </div>
        <div className="flex min-w-0 flex-1 justify-end gap-1 sm:gap-2" aria-hidden>
          <div className="bg-muted/50 h-11 w-11 rounded-full md:hidden" />
          <div className="bg-muted/50 h-11 w-11 rounded-full" />
          <div className="bg-muted/50 h-11 w-11 rounded-full" />
          <div className="bg-muted/50 h-11 w-11 rounded-full" />
        </div>
      </div>
    </header>
  );
}

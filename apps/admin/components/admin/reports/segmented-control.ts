/** Shared segmented tab / pill toggle styles (theme tokens). */
export const segmentedControl = {
  track:
    'flex flex-nowrap gap-2 overflow-x-auto whitespace-nowrap rounded-xl border border-border bg-muted px-2.5 py-2 scrollbar-none',
  tab: 'inline-flex min-h-11 shrink-0 items-center justify-center rounded-md px-4 text-xs font-medium leading-none transition-colors',
  tabActive:
    'bg-card text-foreground shadow-sm ring-1 ring-border dark:bg-accent dark:text-accent-foreground dark:ring-border/60',
  tabInactive: 'text-muted-foreground hover:text-foreground',
} as const;

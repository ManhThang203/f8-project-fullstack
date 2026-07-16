import { cn } from '@/lib/utils';

/** Class dùng chung cho input/textarea trong trang cài đặt. */
export const settingsInputClass = cn(
  'min-h-11 w-full rounded-xl border-0 bg-muted px-4 py-2.5 text-base text-foreground sm:text-sm',
  'placeholder:text-muted-foreground',
  'outline-hidden transition-shadow duration-150',
  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
);

export const settingsLabelClass = 'text-muted-foreground text-xs font-medium';

export const settingsFieldClass = 'flex flex-col gap-1.5';

export const settingsErrorClass = 'text-xs text-red-600';

/** Nút secondary/ghost trong settings — tăng tương phản trên nền card. */
export const settingsSecondaryButtonClass =
  'border-muted-foreground/45 bg-muted hover:bg-muted/80';

export const settingsGhostButtonClass = 'hover:bg-muted/80';

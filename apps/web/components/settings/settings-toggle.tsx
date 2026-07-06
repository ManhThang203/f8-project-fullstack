'use client';

import { cn } from '@/lib/utils';

type Props = {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
};

/** Toggle bật/tắt dùng trong trang cài đặt. */
export function SettingsToggle({
  id,
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: Props) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="text-foreground block text-sm font-medium">
          {label}
        </label>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm text-pretty">{description}</p>
        ) : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full',
          'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:pointer-events-none disabled:opacity-40',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'inline-flex h-7 w-12 shrink-0 items-center rounded-full border p-0.5 transition-colors duration-150',
            checked
              ? 'border-primary bg-primary justify-end'
              : 'border-muted-foreground/50 bg-muted-foreground/25 justify-start',
          )}
        >
          <span
            className={cn(
              'h-6 w-6 shrink-0 rounded-full shadow-md transition-[transform,background-color,box-shadow] duration-150',
              checked
                ? 'bg-primary-foreground'
                : 'bg-foreground shadow-sm ring-1 ring-border/70',
            )}
          />
        </span>
        <span className="sr-only">{label}</span>
      </button>
    </div>
  );
}

'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg' | 'icon-sm' | 'icon-md';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
};

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary/90 border border-transparent',
  secondary:
    'bg-transparent text-foreground border border-border hover:bg-muted',
  ghost: 'bg-transparent text-foreground hover:bg-muted border border-transparent',
};

const sizeClasses: Record<Size, string> = {
  sm: 'min-h-9 px-3 text-sm rounded-lg',
  md: 'min-h-11 px-4 text-sm rounded-lg',
  lg: 'min-h-11 px-6 text-sm rounded-lg',
  'icon-sm': 'min-h-9 min-w-9 rounded-lg',
  'icon-md': 'min-h-11 min-w-11 rounded-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: Props) {
  const isIcon = size === 'icon-sm' || size === 'icon-md';

  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        isIcon && 'p-0',
        className,
      )}
      {...props}
    >
      {loading ? (
        <span
          className="border-current h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
          aria-hidden
        />
      ) : (
        children
      )}
    </button>
  );
}

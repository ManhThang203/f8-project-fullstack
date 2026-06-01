'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  children: ReactNode;
};

const variants = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/10 border border-primary/20',
  secondary: 'border border-border bg-card text-foreground hover:bg-muted hover:border-muted-foreground/35 shadow-sm',
  ghost: 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-600/10',
};

export function Button({ variant = 'primary', className, children, ...props }: Props) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-4 text-sm font-medium transition-all duration-200 ease-in-out active:scale-[0.98] active:duration-75 disabled:opacity-50 disabled:active:scale-100 disabled:pointer-events-none cursor-pointer select-none',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

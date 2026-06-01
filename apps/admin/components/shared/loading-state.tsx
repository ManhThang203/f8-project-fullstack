'use client';

import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

type Props = {
  variant?: 'page' | 'inline' | 'overlay';
  className?: string;
  label?: string;
};

/** Trạng thái loading với spinner và text i18n. */
export function LoadingState({ variant = 'inline', className, label }: Props) {
  const { t } = useTranslation();
  const message = label ?? t('common.loading');

  return (
    <div
      className={cn(
        'flex flex-row items-center justify-center gap-2 text-muted-foreground',
        variant === 'page' && 'min-h-screen bg-background',
        variant === 'inline' && 'py-12',
        variant === 'overlay' && 'absolute inset-0 z-10 rounded-xl bg-background/60',
        className,
      )}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <Loader2
        className="size-5 shrink-0 animate-spin motion-reduce:animate-none"
        aria-hidden
      />
      <span className="text-sm">{message}</span>
    </div>
  );
}

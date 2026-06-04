'use client';

import { CostySplash } from '@costy/ui';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

type Props = {
  variant?: 'page' | 'inline' | 'overlay';
  className?: string;
  label?: string;
  hideText?: boolean;
};

/** Trạng thái loading với spinner và text i18n, hỗ trợ logo động cho màn hình F5. */
export function LoadingState({ variant = 'inline', className, label, hideText = false }: Props) {
  const { t } = useTranslation();
  const message = label ?? t('common.loading');

  if (variant === 'page') {
    return <CostySplash className={className} />;
  }

  const isOverlay = variant === 'overlay';

  return (
    <div
      className={cn(
        'flex flex-row items-center justify-center gap-2 text-muted-foreground',
        isOverlay && 'absolute inset-0 z-10 rounded-xl bg-background/60',
        variant === 'inline' && 'py-12',
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
      {!hideText && !isOverlay && <span className="text-sm">{message}</span>}
    </div>
  );
}


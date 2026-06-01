'use client';

import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function StatChartCard({ title, description, children, className }: Props) {
  return (
    <section
      className={cn(
        'rounded-xl border border-border bg-card p-6 shadow-sm',
        className,
      )}
    >
      <header className="mb-4 space-y-1">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

type ChartStateProps = {
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
};

/** Skeleton hoặc empty state cho chart. */
export function ChartState({ isLoading, isEmpty, emptyMessage, children }: ChartStateProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div
        className="h-64 animate-pulse rounded-lg bg-muted"
        aria-busy="true"
        aria-label={t('charts.loading')}
      />
    );
  }

  if (isEmpty) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        {emptyMessage ?? t('common.noData')}
      </div>
    );
  }

  return <>{children}</>;
}

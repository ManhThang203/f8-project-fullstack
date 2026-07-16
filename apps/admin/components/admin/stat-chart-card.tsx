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
    <section className={cn('border-border bg-card rounded-xl border p-6 shadow-xs', className)}>
      <header className="mb-4 space-y-1">
        <h2 className="text-foreground text-base font-semibold">{title}</h2>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
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
        className="bg-muted h-64 animate-pulse rounded-lg"
        aria-busy="true"
        aria-label={t('charts.loading')}
      />
    );
  }

  if (isEmpty) {
    return (
      <div className="border-border text-muted-foreground flex h-64 items-center justify-center rounded-lg border border-dashed text-sm">
        {emptyMessage ?? t('common.noData')}
      </div>
    );
  }

  return <>{children}</>;
}

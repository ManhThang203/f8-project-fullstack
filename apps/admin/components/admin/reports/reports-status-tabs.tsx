'use client';

import { useTranslation } from 'react-i18next';

import { ALL_STATUSES } from '@/components/admin/reports/reports.constants';
import { segmentedControl } from './segmented-control';
import { cn } from '@/lib/utils';

type Props = {
  statusFilter: string;
  onStatusChange: (status: string) => void;
  className?: string;
};

export function ReportsStatusTabs({ statusFilter, onStatusChange, className }: Props) {
  const { t } = useTranslation();

  return (
    <div className={cn('relative max-w-full w-fit min-w-0', className)}>
      <div
        role="tablist"
        aria-label={t('reports.filterByStatus')}
        className={cn(segmentedControl.track, 'inline-flex w-max max-w-full')}
      >
        <button
          type="button"
          role="tab"
          aria-selected={statusFilter === ''}
          onClick={() => onStatusChange('')}
          className={cn(
            segmentedControl.tab,
            statusFilter === '' ? segmentedControl.tabActive : segmentedControl.tabInactive,
          )}
        >
          {t('reports.allStatuses')}
        </button>
        {ALL_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            role="tab"
            aria-selected={statusFilter === status}
            onClick={() => onStatusChange(status)}
            className={cn(
              segmentedControl.tab,
              statusFilter === status
                ? segmentedControl.tabActive
                : segmentedControl.tabInactive,
            )}
          >
            {t(`reportStatus.${status}`, status)}
          </button>
        ))}
      </div>
    </div>
  );
}

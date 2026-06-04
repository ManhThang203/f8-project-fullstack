'use client';

import { useTranslation } from 'react-i18next';

import { ALL_CASE_STATUSES } from '@/components/admin/moderation/moderation-cases.constants';
import { segmentedControl } from '@/components/admin/reports/segmented-control';
import { cn } from '@/lib/utils';

type Props = {
  statusFilter: string;
  onStatusChange: (status: string) => void;
  className?: string;
};

export function ModerationStatusTabs({ statusFilter, onStatusChange, className }: Props) {
  const { t } = useTranslation();

  return (
    <div className={cn('relative max-w-full w-fit min-w-0', className)}>
      <div
        role="tablist"
        aria-label={t('moderation.filterByStatus')}
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
          {t('moderation.allStatuses')}
        </button>
        {ALL_CASE_STATUSES.map((status) => (
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
            {t(`caseStatus.${status}`, status)}
          </button>
        ))}
      </div>
    </div>
  );
}

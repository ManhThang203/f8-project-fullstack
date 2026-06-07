'use client';

import { useTranslation } from 'react-i18next';

import { ALL_MODERATION_STATUSES } from '@/components/admin/moderation/moderation.constants';
import { segmentedControl } from '@/components/admin/reports/segmented-control';
import { cn } from '@/lib/utils';

type Props = {
  statusFilter: string;
  onStatusChange: (status: string) => void;
  className?: string;
};

const STATUS_I18N: Record<string, string> = {
  OPEN: 'moderation.statusFilter.open',
  PENDING: 'moderation.statusFilter.pending',
  AUTO_HIDDEN: 'moderation.statusFilter.autoHidden',
  RESOLVED_KEPT: 'moderation.statusFilter.resolvedKept',
  RESOLVED_REMOVED: 'moderation.statusFilter.resolvedRemoved',
  DISMISSED: 'moderation.statusFilter.dismissed',
};

export function ModerationStatusTabs({ statusFilter, onStatusChange, className }: Props) {
  const { t } = useTranslation();

  return (
    <div className={cn('relative w-fit min-w-0 max-w-full', className)}>
      <div className={cn(segmentedControl.track, 'inline-flex w-max max-w-full')}>
        <button
          type="button"
          className={cn(
            segmentedControl.tab,
            statusFilter === '' ? segmentedControl.tabActive : segmentedControl.tabInactive,
          )}
          onClick={() => onStatusChange('')}
        >
          {t('moderation.allStatuses')}
        </button>
        {ALL_MODERATION_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className={cn(
              segmentedControl.tab,
              statusFilter === status ? segmentedControl.tabActive : segmentedControl.tabInactive,
            )}
            onClick={() => onStatusChange(status)}
          >
            {t(STATUS_I18N[status] ?? status, status)}
          </button>
        ))}
      </div>
    </div>
  );
}

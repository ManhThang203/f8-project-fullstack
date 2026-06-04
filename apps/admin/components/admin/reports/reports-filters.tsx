'use client';

import { useTranslation } from 'react-i18next';

import { ReportsStatusTabs } from '@/components/admin/reports/reports-status-tabs';
import { ALL_REASONS, ALL_TARGETS } from '@/components/admin/reports/reports.constants';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/shared/select';

type Props = {
  statusFilter: string;
  reasonFilter: string;
  targetFilter: string;
  onStatusChange: (status: string) => void;
  onReasonChange: (reason: string) => void;
  onTargetChange: (target: string) => void;
};

export function ReportsFilters({
  statusFilter,
  reasonFilter,
  targetFilter,
  onStatusChange,
  onReasonChange,
  onTargetChange,
}: Props) {
  const { t } = useTranslation();

  const reasonTriggerLabel =
    reasonFilter === 'ALL'
      ? t('reports.allReasons')
      : t(`reportReasonShort.${reasonFilter}`, t(`reportReason.${reasonFilter}`, reasonFilter));

  return (
    <div className="space-y-2 lg:flex lg:items-center lg:gap-3 lg:space-y-0">
      <ReportsStatusTabs
        statusFilter={statusFilter}
        onStatusChange={onStatusChange}
        className="max-w-full shrink-0"
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:ml-auto lg:flex lg:shrink-0 lg:gap-2">
        <Select value={reasonFilter} onValueChange={onReasonChange}>
          <SelectTrigger className="border-border bg-card w-full rounded-xl border text-xs sm:min-w-[140px] sm:max-w-[200px] lg:w-[200px]">
            <span className="truncate">{reasonTriggerLabel}</span>
          </SelectTrigger>
          <SelectContent className="border-border bg-card rounded-xl border shadow-lg">
            <SelectItem value="ALL">{t('reports.allReasons')}</SelectItem>
            {ALL_REASONS.map((reason) => (
              <SelectItem key={reason} value={reason}>
                {t(`reportReason.${reason}`, reason)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={targetFilter} onValueChange={onTargetChange}>
          <SelectTrigger className="border-border bg-card w-full rounded-xl border text-xs sm:min-w-[140px] sm:max-w-[200px] lg:w-[180px]">
            <span className="truncate">
              {targetFilter === 'ALL'
                ? t('reports.allTargets')
                : t(`targetType.${targetFilter}`, targetFilter)}
            </span>
          </SelectTrigger>
          <SelectContent className="border-border bg-card rounded-xl border shadow-lg">
            <SelectItem value="ALL">{t('reports.allTargets')}</SelectItem>
            {ALL_TARGETS.map((targetType) => (
              <SelectItem key={targetType} value={targetType}>
                {t(`targetType.${targetType}`, targetType)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

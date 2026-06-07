'use client';

import { useTranslation } from 'react-i18next';

import { segmentedControl } from '@/components/admin/reports/segmented-control';
import { cn } from '@/lib/utils';

export type ReportsHubTab = 'user-reports' | 'ai-moderation';

type Props = {
  activeTab: ReportsHubTab;
  onTabChange: (tab: ReportsHubTab) => void;
  aiPendingCount?: number;
  className?: string;
};

export function ReportsHubTabs({ activeTab, onTabChange, aiPendingCount, className }: Props) {
  const { t } = useTranslation();

  return (
    <div className={cn('relative w-fit min-w-0 max-w-full', className)}>
      <div className={cn(segmentedControl.track, 'inline-flex w-max max-w-full')}>
        <button
          type="button"
          className={cn(
            segmentedControl.tab,
            activeTab === 'user-reports'
              ? segmentedControl.tabActive
              : segmentedControl.tabInactive,
          )}
          onClick={() => onTabChange('user-reports')}
        >
          {t('reports.hubTab.userReports')}
        </button>
        <button
          type="button"
          className={cn(
            segmentedControl.tab,
            activeTab === 'ai-moderation'
              ? segmentedControl.tabActive
              : segmentedControl.tabInactive,
          )}
          onClick={() => onTabChange('ai-moderation')}
        >
          {t('reports.hubTab.aiModeration')}
          {aiPendingCount != null && aiPendingCount > 0 ? (
            <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-orange-500/15 px-1.5 py-0.5 text-xs font-semibold text-orange-700">
              {aiPendingCount > 99 ? '99+' : aiPendingCount}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}

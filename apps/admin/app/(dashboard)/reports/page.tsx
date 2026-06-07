'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ModerationCasesCardList } from '@/components/admin/moderation/moderation-cases-card-list';
import { ModerationCardSkeleton } from '@/components/admin/moderation/moderation-card-skeleton';
import { ModerationCasesTable } from '@/components/admin/moderation/moderation-cases-table';
import { ModerationStatusTabs } from '@/components/admin/moderation/moderation-status-tabs';
import { ModerationTableSkeleton } from '@/components/admin/moderation/moderation-table-skeleton';
import { ReportsCardList } from '@/components/admin/reports/reports-card-list';
import { ReportsCardSkeleton } from '@/components/admin/reports/reports-card-skeleton';
import { ReportsFilters } from '@/components/admin/reports/reports-filters';
import { ReportsHubTabs, type ReportsHubTab } from '@/components/admin/reports/reports-hub-tabs';
import { ReportsTable } from '@/components/admin/reports/reports-table';
import { ReportsTableSkeleton } from '@/components/admin/reports/reports-table-skeleton';
import { CursorPagination } from '@/components/shared/cursor-pagination';
import {
  useAdminReports,
  useModerationCases,
  useReviewReport,
  useStatsOverview,
} from '@/hooks/queries/use-admin-queries';
import { useCursorPagination } from '@/hooks/use-cursor-pagination';

export default function ReportsPage() {
  const { t, i18n } = useTranslation();
  const searchParams = useSearchParams();

  const [hubTab, setHubTab] = useState<ReportsHubTab>(
    searchParams.get('tab') === 'ai-moderation' ? 'ai-moderation' : 'user-reports',
  );

  const [statusFilter, setStatusFilter] = useState<string>('OPEN');
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');
  const [targetFilter, setTargetFilter] = useState<string>('ALL');

  const [modStatusFilter, setModStatusFilter] = useState<string>('OPEN');

  const { limit, setLimit, cursor, pageIndex, handleNext, handlePrev, reset } =
    useCursorPagination(20);
  const review = useReviewReport();
  const { data: overview } = useStatsOverview('30d');

  const isOpenQueue = statusFilter === 'OPEN';
  const isModOpenQueue = modStatusFilter === 'OPEN';

  const { data: reportsData, isLoading: reportsLoading } = useAdminReports({
    queue: isOpenQueue ? 'open' : undefined,
    status: !statusFilter || isOpenQueue ? undefined : statusFilter,
    reason: reasonFilter === 'ALL' || !reasonFilter ? undefined : reasonFilter,
    targetType: targetFilter === 'ALL' || !targetFilter ? undefined : targetFilter,
    cursor: hubTab === 'user-reports' ? cursor || undefined : undefined,
    limit: hubTab === 'user-reports' ? limit : undefined,
  });

  const { data: modData, isLoading: modLoading } = useModerationCases({
    queue: isModOpenQueue ? 'open' : undefined,
    status: !modStatusFilter || isModOpenQueue ? undefined : modStatusFilter,
    cursor: hubTab === 'ai-moderation' ? cursor || undefined : undefined,
    limit: hubTab === 'ai-moderation' ? limit : undefined,
  });

  const reports = reportsData?.data ?? [];
  const modCases = modData?.data ?? [];
  const nextCursor =
    hubTab === 'user-reports' ? reportsData?.meta?.nextCursor : modData?.meta?.nextCursor;
  const isLoading = hubTab === 'user-reports' ? reportsLoading : modLoading;
  const items = hubTab === 'user-reports' ? reports : modCases;
  const skeletonRows = Math.min(limit, 8);

  const handleDismiss = useCallback(
    (id: string) => {
      review.mutate({
        id,
        status: 'DISMISSED',
        resolutionNote: t('reports.dismissNote'),
      });
    },
    [review, t],
  );

  const handleTabChange = (tab: ReportsHubTab) => {
    setHubTab(tab);
    reset();
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">{t('reports.hubTitle')}</h2>
        <p className="text-muted-foreground mt-0.5 text-sm">{t('reports.hubSubtitle')}</p>
      </div>

      <ReportsHubTabs
        activeTab={hubTab}
        onTabChange={handleTabChange}
        aiPendingCount={overview?.data.pendingModerationCases}
      />

      {hubTab === 'user-reports' ? (
        <ReportsFilters
          statusFilter={statusFilter}
          reasonFilter={reasonFilter}
          targetFilter={targetFilter}
          onStatusChange={setStatusFilter}
          onReasonChange={setReasonFilter}
          onTargetChange={setTargetFilter}
        />
      ) : (
        <ModerationStatusTabs statusFilter={modStatusFilter} onStatusChange={setModStatusFilter} />
      )}

      {isLoading && !reportsData && !modData ? (
        hubTab === 'user-reports' ? (
          <>
            <ReportsTableSkeleton rows={skeletonRows} />
            <ReportsCardSkeleton rows={Math.min(limit, 5)} />
          </>
        ) : (
          <>
            <ModerationTableSkeleton rows={skeletonRows} />
            <ModerationCardSkeleton rows={Math.min(limit, 5)} />
          </>
        )
      ) : (
        <>
          {items.length === 0 ? (
            <div className="border-border bg-card rounded-xl border p-10 text-center">
              <p className="text-muted-foreground text-sm">
                {hubTab === 'user-reports' ? t('reports.empty') : t('moderation.empty')}
              </p>
            </div>
          ) : hubTab === 'user-reports' ? (
            <>
              <ReportsTable
                reports={reports}
                isReviewPending={review.isPending}
                onDismiss={handleDismiss}
                locale={i18n.language}
              />
              <ReportsCardList
                reports={reports}
                isReviewPending={review.isPending}
                onDismiss={handleDismiss}
                locale={i18n.language}
              />
            </>
          ) : (
            <>
              <ModerationCasesTable cases={modCases} locale={i18n.language} />
              <ModerationCasesCardList cases={modCases} locale={i18n.language} />
            </>
          )}

          {items.length > 0 && (
            <CursorPagination
              limit={limit}
              onLimitChange={setLimit}
              hasMore={!!nextCursor}
              pageIndex={pageIndex}
              onPrev={handlePrev}
              onNext={() => handleNext(nextCursor)}
            />
          )}
        </>
      )}
    </div>
  );
}

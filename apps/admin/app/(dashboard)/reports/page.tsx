'use client';

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ReportsCardList } from '@/components/admin/reports/reports-card-list';
import { ReportsCardSkeleton } from '@/components/admin/reports/reports-card-skeleton';
import { ReportsFilters } from '@/components/admin/reports/reports-filters';
import { ReportsTable } from '@/components/admin/reports/reports-table';
import { ReportsTableSkeleton } from '@/components/admin/reports/reports-table-skeleton';
import { CursorPagination } from '@/components/shared/cursor-pagination';
import { useAdminReports, useReviewReport } from '@/hooks/queries/use-admin-queries';
import { useCursorPagination } from '@/hooks/use-cursor-pagination';

export default function ReportsPage() {
  const { t, i18n } = useTranslation();

  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');
  const [targetFilter, setTargetFilter] = useState<string>('ALL');

  const { limit, setLimit, cursor, pageIndex, handleNext, handlePrev } = useCursorPagination(20);
  const review = useReviewReport();

  const { data, isLoading } = useAdminReports({
    status: statusFilter || undefined,
    reason: reasonFilter === 'ALL' || !reasonFilter ? undefined : reasonFilter,
    targetType: targetFilter === 'ALL' || !targetFilter ? undefined : targetFilter,
    cursor: cursor || undefined,
    limit,
  });

  const reports = data?.data ?? [];
  const nextCursor = data?.meta?.nextCursor;
  const skeletonRows = Math.min(limit, 8);

  /** Bỏ qua báo cáo với ghi chú mặc định. */
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t('reports.pageTitle')}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground md:block">
            {t('reports.pageSubtitle')}
          </p>
        </div>
      </div>

      <ReportsFilters
        statusFilter={statusFilter}
        reasonFilter={reasonFilter}
        targetFilter={targetFilter}
        onStatusChange={setStatusFilter}
        onReasonChange={setReasonFilter}
        onTargetChange={setTargetFilter}
      />

      {isLoading && !data ? (
        <>
          <ReportsTableSkeleton rows={skeletonRows} />
          <ReportsCardSkeleton rows={Math.min(limit, 5)} />
        </>
      ) : (
        <>
          {reports.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center">
              <p className="text-sm text-muted-foreground">{t('reports.empty')}</p>
            </div>
          ) : (
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
          )}

          {reports.length > 0 && (
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

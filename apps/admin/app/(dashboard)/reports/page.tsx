'use client';

import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/button';
import { CursorPagination } from '@/components/shared/cursor-pagination';
import { Skeleton } from '@/components/shared/skeleton';
import { useAdminReports, useReviewReport } from '@/hooks/queries/use-admin-queries';
import { useCursorPagination } from '@/hooks/use-cursor-pagination';

export default function ReportsPage() {
  const { t, i18n } = useTranslation();

  const { limit, setLimit, cursor, pageIndex, handleNext, handlePrev } = useCursorPagination(10);

  const { data, isLoading } = useAdminReports('PENDING', cursor, limit);
  const review = useReviewReport();

  const reports = data?.data ?? [];
  const nextCursor = data?.meta?.nextCursor;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t('reports.title')}</h2>

      {isLoading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-4 w-full max-w-md" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-16" />
                  <Skeleton className="h-9 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {reports.length === 0 ? (
              <p className="text-muted-foreground">{t('reports.empty')}</p>
            ) : (
              reports.map((report) => (
                <article key={report.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        {report.targetType} · {report.reason}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        @{report.reporter?.username ?? report.reporterId} ·{' '}
                        {new Date(report.createdAt).toLocaleString(
                          i18n.language === 'en' ? 'en-US' : 'vi-VN',
                        )}
                      </p>
                      {report.targetPreview ? (
                        <p className="mt-2 text-sm text-muted-foreground">{report.targetPreview}</p>
                      ) : null}
                      {report.reportCount && report.reportCount > 1 ? (
                        <p className="mt-1 text-xs text-amber-400">
                          {t('reports.reportCount', { count: report.reportCount })}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        className="min-h-9 text-xs"
                        onClick={() =>
                          review.mutate({
                            id: report.id,
                            status: 'REJECTED',
                            resolutionNote: t('reports.dismissNote'),
                          })
                        }
                      >
                        {t('reports.dismiss')}
                      </Button>
                      <Button
                        className="min-h-9 text-xs"
                        onClick={() =>
                          review.mutate({
                            id: report.id,
                            status: 'ACTION_TAKEN',
                            resolutionNote: t('reports.approveNote'),
                          })
                        }
                      >
                        {t('reports.approve')}
                      </Button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
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

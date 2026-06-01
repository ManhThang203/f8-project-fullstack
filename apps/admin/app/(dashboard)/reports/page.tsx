'use client';

import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/button';
import { LoadingState } from '@/components/shared/loading-state';
import { useAdminReports, useReviewReport } from '@/hooks/queries/use-admin-queries';

export default function ReportsPage() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useAdminReports('PENDING');
  const review = useReviewReport();

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t('reports.title')}</h2>
      <div className="space-y-3">
        {(data?.data ?? []).length === 0 ? (
          <p className="text-muted-foreground">{t('reports.empty')}</p>
        ) : (
          (data?.data ?? []).map((report) => (
            <article
              key={report.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {report.targetType} · {report.reason}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    @{report.reporter?.username ?? report.reporterId} ·{' '}
                    {new Date(report.createdAt).toLocaleString(i18n.language === 'en' ? 'en-US' : 'vi-VN')}
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
    </div>
  );
}

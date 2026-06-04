'use client';

import type { AdminReportDto } from '@costy/shared';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import {
  REASON_COLORS,
  REPORT_ESCALATE_THRESHOLD,
  STATUS_COLORS,
  type ReportReason,
  type ReportStatus,
} from '@/components/admin/reports/reports.constants';
import { Button } from '@/components/shared/button';

type Props = {
  reports: AdminReportDto[];
  isReviewPending: boolean;
  onDismiss: (id: string) => void;
  locale: string;
};

/** Định dạng ngày báo cáo theo locale hiện tại. */
function formatReportDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'vi-VN');
}

export function ReportsCardList({ reports, isReviewPending, onDismiss, locale }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 lg:hidden">
      {reports.map((report) => {
        const isHighPriority = (report.reportCount ?? 0) >= REPORT_ESCALATE_THRESHOLD;
        const reason = report.reason as ReportReason;
        const status = report.status as ReportStatus;
        const reporterUsername = report.reporter?.username ?? t('common.unknownUser');

        return (
          <div
            key={report.id}
            className={`space-y-3 rounded-xl border border-border bg-card p-4 transition-colors ${
              isHighPriority ? 'border-red-500/20 bg-red-500/5' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {t(`targetType.${report.targetType}`, report.targetType)}
              </span>
              <span
                className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[status] ?? ''}`}
              >
                {t(`reportStatus.${status}`, status)}
              </span>
            </div>

            {report.targetPreview ? (
              <p className="line-clamp-2 rounded-lg bg-muted/30 p-2 text-xs italic text-muted-foreground">
                &ldquo;{report.targetPreview}&rdquo;
              </p>
            ) : null}

            <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 text-xs">
              <span
                className={`inline-flex w-fit shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${REASON_COLORS[reason] ?? ''}`}
              >
                {t(`reportReasonShort.${reason}`, t(`reportReason.${reason}`, reason))}
              </span>
              <div className="flex items-center justify-end gap-1.5 text-muted-foreground">
                <span>{t('reports.reportCountLabel')}:</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                    isHighPriority
                      ? 'bg-red-500/20 text-red-700 dark:text-red-400'
                      : 'bg-zinc-500/20 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {report.reportCount || 1}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2 text-xs text-muted-foreground">
              <span className="min-w-0 truncate">@{reporterUsername}</span>
              <span className="shrink-0">{formatReportDate(report.createdAt, locale)}</span>
            </div>

            <div className="flex gap-2 pt-1">
              {(status === 'PENDING' || status === 'UNDER_REVIEW') && (
                <Button
                  className="h-9 flex-1 text-xs"
                  variant="secondary"
                  disabled={isReviewPending}
                  onClick={() => onDismiss(report.id)}
                >
                  {t('reports.dismiss')}
                </Button>
              )}
              <Link href={`/reports/${report.id}`} className="flex-1">
                <Button className="h-9 w-full text-xs" variant="secondary">
                  {t('reports.detail')}
                </Button>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

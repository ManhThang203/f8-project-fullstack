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
import { adminTable } from '@/lib/admin-table';
import { cn } from '@/lib/utils';

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

export function ReportsTable({ reports, isReviewPending, onDismiss, locale }: Props) {
  const { t } = useTranslation();

  return (
    <div className={adminTable.wrap}>
      <table className={cn(adminTable.table, 'min-w-[800px]')}>
        <thead className={adminTable.thead}>
          <tr>
            <th className={cn(adminTable.th, adminTable.thLeft)}>
              {t('reports.columns.target')}
            </th>
            <th className={cn(adminTable.th, adminTable.thLeft)}>
              {t('reports.columns.reason')}
            </th>
            <th
              className={cn(adminTable.th, adminTable.thLeft, 'hidden xl:table-cell')}
            >
              {t('reports.columns.reporter')}
            </th>
            <th className={cn(adminTable.th, adminTable.thCenter)}>
              {t('reports.columns.reportCount')}
            </th>
            <th className={cn(adminTable.th, adminTable.thLeft)}>
              {t('reports.columns.status')}
            </th>
            <th
              className={cn(adminTable.th, adminTable.thLeft, 'hidden xl:table-cell')}
            >
              {t('reports.columns.time')}
            </th>
            <th className={cn(adminTable.th, adminTable.thRight)}>
              {t('reports.columns.actions')}
            </th>
          </tr>
        </thead>
        <tbody className={adminTable.tbodyDivide}>
          {reports.map((report) => {
            const isHighPriority = (report.reportCount ?? 0) >= REPORT_ESCALATE_THRESHOLD;
            const reason = report.reason as ReportReason;
            const status = report.status as ReportStatus;
            const reporterUsername = report.reporter?.username ?? t('common.unknownUser');
            const formattedDate = formatReportDate(report.createdAt, locale);

            return (
              <tr
                key={report.id}
                className={cn(adminTable.row, isHighPriority && 'bg-red-500/5')}
              >
                <td className={adminTable.td}>
                  <div className={adminTable.cellColStart}>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {t(`targetType.${report.targetType}`, report.targetType)}
                      </span>
                      {report.targetPreview ? (
                        <span className="max-w-[180px] truncate text-xs text-muted-foreground">
                          {report.targetPreview}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground xl:hidden">
                      @{reporterUsername} · {formattedDate}
                    </p>
                  </div>
                </td>

                <td className={adminTable.td}>
                  <div className={adminTable.cellStart}>
                    <span
                      className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${REASON_COLORS[reason] ?? ''}`}
                    >
                      {t(`reportReasonShort.${reason}`, t(`reportReason.${reason}`, reason))}
                    </span>
                  </div>
                </td>

                <td className={cn(adminTable.td, 'hidden xl:table-cell')}>
                  <div className={adminTable.cellStart}>
                    <span className="text-xs text-muted-foreground">@{reporterUsername}</span>
                  </div>
                </td>

                <td className={adminTable.tdCenter}>
                  <div className={adminTable.cellCenter}>
                    {(report.reportCount ?? 0) > 1 ? (
                      <span
                        className={`inline-flex shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
                          isHighPriority
                            ? 'bg-red-500/20 text-red-700 dark:text-red-400'
                            : 'bg-zinc-500/20 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {report.reportCount}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">1</span>
                    )}
                  </div>
                </td>

                <td className={adminTable.td}>
                  <div className={adminTable.cellStart}>
                    <span
                      className={`inline-flex shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? ''}`}
                    >
                      {t(`reportStatus.${status}`, status)}
                    </span>
                  </div>
                </td>

                <td className={cn(adminTable.td, 'hidden text-xs text-muted-foreground xl:table-cell')}>
                  <div className={adminTable.cellStart}>{formattedDate}</div>
                </td>

                <td className={adminTable.tdRight}>
                  <div className={adminTable.cellEnd}>
                    {status === 'PENDING' || status === 'UNDER_REVIEW' ? (
                      <Button
                        variant="secondary"
                        className={adminTable.actionBtn}
                        disabled={isReviewPending}
                        onClick={() => onDismiss(report.id)}
                      >
                        {t('reports.dismiss')}
                      </Button>
                    ) : null}
                    <Link href={`/reports/${report.id}`} className="inline-flex">
                      <Button className={adminTable.actionBtn} variant="secondary">
                        {t('reports.detail')}
                      </Button>
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

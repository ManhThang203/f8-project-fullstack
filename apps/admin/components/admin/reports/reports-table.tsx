'use client';

import type { AdminReportDto } from '@costy/shared';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import {
  isActionableReportStatus,
  REASON_COLORS,
  REPORT_ESCALATE_THRESHOLD,
  STATUS_COLORS,
  type ReportReason,
  type ReportStatus,
} from '@/components/admin/reports/reports.constants';
import { Button } from '@/components/shared/button';
import { adminCol, adminTable } from '@/lib/admin-table';
import { cn } from '@/lib/utils';

type Props = {
  reports: AdminReportDto[];
  isReviewPending: boolean;
  onDismiss: (id: string) => void;
  locale: string;
};

const colTarget = adminCol('grow', 'start');
const colReason = adminCol('grow', 'center');
const colReporter = adminCol('grow', 'center');
const colReportCount = adminCol('grow', 'center');
const colStatus = adminCol('grow', 'center');
const colTime = adminCol('grow', 'center');
const colActions = adminCol('actions', 'end');

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
            <th className={colTarget.th}>{t('reports.columns.target')}</th>
            <th className={colReason.th}>{t('reports.columns.reason')}</th>
            <th className={cn(colReporter.th, 'hidden xl:table-cell')}>
              {t('reports.columns.reporter')}
            </th>
            <th className={colReportCount.th}>{t('reports.columns.reportCount')}</th>
            <th className={colStatus.th}>{t('reports.columns.status')}</th>
            <th className={cn(colTime.th, 'hidden xl:table-cell')}>
              {t('reports.columns.time')}
            </th>
            <th className={colActions.th}>{t('reports.columns.actions')}</th>
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
              <tr key={report.id} className={cn(adminTable.row, isHighPriority && 'bg-red-500/5')}>
                <td className={colTarget.td}>
                  <div className={colTarget.cell}>
                    <div className="flex min-w-0 items-center justify-center gap-2">
                      <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-xs">
                        {t(`targetType.${report.targetType}`, report.targetType)}
                      </span>
                      {report.targetPreview ? (
                        <span className="text-muted-foreground max-w-[180px] truncate text-xs">
                          {report.targetPreview}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground mt-0.5 truncate text-xs xl:hidden">
                      @{reporterUsername} · {formattedDate}
                    </p>
                  </div>
                </td>

                <td className={colReason.td}>
                  <div className={colReason.cell}>
                    <span
                      className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${REASON_COLORS[reason] ?? ''}`}
                    >
                      {t(`reportReasonShort.${reason}`, t(`reportReason.${reason}`, reason))}
                    </span>
                  </div>
                </td>

                <td className={cn(colReporter.td, 'hidden xl:table-cell')}>
                  <div className={colReporter.cell}>
                    <span className="text-muted-foreground text-xs">@{reporterUsername}</span>
                  </div>
                </td>

                <td className={colReportCount.td}>
                  <div className={colReportCount.cell}>
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
                      <span className="text-muted-foreground text-xs">1</span>
                    )}
                  </div>
                </td>

                <td className={colStatus.td}>
                  <div className={colStatus.cell}>
                    <span
                      className={`inline-flex shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? ''}`}
                    >
                      {t(`reportStatus.${status}`, status)}
                    </span>
                  </div>
                </td>

                <td className={cn(colTime.td, 'text-muted-foreground hidden text-xs xl:table-cell')}>
                  <div className={colTime.cell}>{formattedDate}</div>
                </td>

                <td className={colActions.td}>
                  <div className={colActions.cell}>
                    {isActionableReportStatus(status) ? (
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

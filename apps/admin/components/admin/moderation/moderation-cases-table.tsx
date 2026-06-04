'use client';

import type { ModerationCaseDto } from '@costy/shared';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import {
  CASE_ESCALATE_THRESHOLD,
  CASE_STATUS_COLORS,
  TRIGGER_COLORS,
} from '@/components/admin/moderation/moderation-cases.constants';
import { Button } from '@/components/shared/button';
import { adminCol, adminTable } from '@/lib/admin-table';
import { cn } from '@/lib/utils';

type Props = {
  cases: ModerationCaseDto[];
  locale: string;
};

const colTarget = adminCol('grow', 'start');
const colTrigger = adminCol('grow', 'center');
const colAuthor = adminCol('grow', 'center');
const colReportCount = adminCol('grow', 'center');
const colStatus = adminCol('grow', 'center');
const colTime = adminCol('grow', 'center');
const colActions = adminCol('actions', 'end');

function formatCaseDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'vi-VN');
}

export function ModerationCasesTable({ cases, locale }: Props) {
  const { t } = useTranslation();

  return (
    <div className={adminTable.wrap}>
      <table className={cn(adminTable.table, 'min-w-[800px]')}>
        <thead className={adminTable.thead}>
          <tr>
            <th className={colTarget.th}>{t('moderation.columns.target')}</th>
            <th className={colTrigger.th}>{t('moderation.columns.trigger')}</th>
            <th className={cn(colAuthor.th, 'hidden xl:table-cell')}>
              {t('moderation.columns.author')}
            </th>
            <th className={colReportCount.th}>{t('moderation.columns.reportCount')}</th>
            <th className={colStatus.th}>{t('moderation.columns.status')}</th>
            <th className={cn(colTime.th, 'hidden xl:table-cell')}>
              {t('moderation.columns.time')}
            </th>
            <th className={colActions.th}>{t('moderation.columns.actions')}</th>
          </tr>
        </thead>
        <tbody className={adminTable.tbodyDivide}>
          {cases.map((item) => {
            const isHighPriority = (item.reportCount ?? 0) >= CASE_ESCALATE_THRESHOLD;
            const authorUsername = item.author?.username ?? t('common.unknownUser');
            const formattedDate = formatCaseDate(item.openedAt, locale);

            return (
              <tr key={item.id} className={cn(adminTable.row, isHighPriority && 'bg-red-500/5')}>
                <td className={colTarget.td}>
                  <div className={colTarget.cell}>
                    <div className="flex min-w-0 items-center justify-center gap-2">
                      <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-xs">
                        {t(`targetType.${item.targetType}`, item.targetType)}
                      </span>
                      {item.targetPreview ? (
                        <span className="text-muted-foreground max-w-[180px] truncate text-xs">
                          {item.targetPreview}
                        </span>
                      ) : null}
                      {item.slaBreached ? (
                        <span className="shrink-0 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                          SLA
                        </span>
                      ) : null}
                      {item.hasPendingAppeal ? (
                        <span className="shrink-0 rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                          {t('moderation.appealBadge')}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground mt-0.5 truncate text-xs xl:hidden">
                      @{authorUsername} · {formattedDate}
                    </p>
                  </div>
                </td>

                <td className={colTrigger.td}>
                  <div className={colTrigger.cell}>
                    <span
                      className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${TRIGGER_COLORS[item.trigger] ?? ''}`}
                    >
                      {t(`moderationTrigger.${item.trigger}`, item.trigger)}
                    </span>
                  </div>
                </td>

                <td className={cn(colAuthor.td, 'hidden xl:table-cell')}>
                  <div className={colAuthor.cell}>
                    <span className="text-muted-foreground text-xs">@{authorUsername}</span>
                  </div>
                </td>

                <td className={colReportCount.td}>
                  <div className={colReportCount.cell}>
                    {(item.reportCount ?? 0) > 1 ? (
                      <span
                        className={`inline-flex shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
                          isHighPriority
                            ? 'bg-red-500/20 text-red-700 dark:text-red-400'
                            : 'bg-zinc-500/20 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {item.reportCount}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">1</span>
                    )}
                  </div>
                </td>

                <td className={colStatus.td}>
                  <div className={colStatus.cell}>
                    <span
                      className={`inline-flex shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${CASE_STATUS_COLORS[item.status] ?? ''}`}
                    >
                      {t(`caseStatus.${item.status}`, item.status)}
                    </span>
                  </div>
                </td>

                <td className={cn(colTime.td, 'text-muted-foreground hidden text-xs xl:table-cell')}>
                  <div className={colTime.cell}>{formattedDate}</div>
                </td>

                <td className={colActions.td}>
                  <div className={colActions.cell}>
                    <Link href={`/moderation/cases/${item.id}`} className="inline-flex">
                      <Button className={adminTable.actionBtn} variant="secondary">
                        {t('moderation.detail')}
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

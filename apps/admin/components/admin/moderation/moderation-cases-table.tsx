'use client';

import type { ModerationCaseDto } from '@costy/shared';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import {
  confidenceTier,
  CONFIDENCE_COLORS,
  isActionableModerationStatus,
  LABEL_COLORS,
  STATUS_COLORS,
  type ModerationCaseStatus,
  type ModerationLabel,
} from '@/components/admin/moderation/moderation.constants';
import { Button } from '@/components/shared/button';
import { adminCol, adminTable } from '@/lib/admin-table';
import { cn } from '@/lib/utils';

type Props = {
  cases: ModerationCaseDto[];
  locale: string;
};

const colContent = adminCol('grow', 'start');
const colLabel = adminCol('grow', 'center');
const colConfidence = adminCol('grow', 'center');
const colAuthor = adminCol('grow', 'center');
const colStatus = adminCol('grow', 'center');
const colTime = adminCol('grow', 'center');
const colActions = adminCol('actions', 'end');

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'vi-VN');
}

export function ModerationCasesTable({ cases, locale }: Props) {
  const { t } = useTranslation();

  return (
    <div className={adminTable.wrap}>
      <table className={adminTable.table}>
        <thead className={adminTable.thead}>
          <tr>
            <th className={colContent.th}>{t('moderation.columns.content')}</th>
            <th className={colLabel.th}>{t('moderation.columns.label')}</th>
            <th className={colConfidence.th}>{t('moderation.columns.confidence')}</th>
            <th className={cn(colAuthor.th, 'hidden xl:table-cell')}>
              {t('moderation.columns.author')}
            </th>
            <th className={colStatus.th}>{t('moderation.columns.status')}</th>
            <th className={cn(colTime.th, 'hidden xl:table-cell')}>
              {t('moderation.columns.time')}
            </th>
            <th className={colActions.th}>{t('moderation.columns.actions')}</th>
          </tr>
        </thead>
        <tbody className={adminTable.tbodyDivide}>
          {cases.map((item) => {
            const label = item.label as ModerationLabel;
            const status = item.status as ModerationCaseStatus;
            const tier = confidenceTier(item.confidence);
            const authorName = item.author?.username ?? t('common.unknownUser');

            return (
              <tr
                key={item.id}
                className={cn(adminTable.row, item.autoHidden && 'bg-orange-500/5')}
              >
                <td className={colContent.td}>
                  <div className={colContent.cell}>
                    <div className="flex min-w-0 items-center justify-center gap-2">
                      <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-xs">
                        {t(`targetType.${item.targetType}`, item.targetType)}
                      </span>
                      {item.targetPreview ? (
                        <span className="text-muted-foreground max-w-[180px] truncate text-xs">
                          {item.targetPreview}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className={colLabel.td}>
                  <div className={colLabel.cell}>
                    <span
                      className={cn(
                        'inline-flex shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium',
                        LABEL_COLORS[label] ?? '',
                      )}
                    >
                      {t(`moderationLabel.${label}`, label)}
                    </span>
                  </div>
                </td>
                <td className={colConfidence.td}>
                  <div className={colConfidence.cell}>
                    <span
                      className={cn(
                        'inline-flex shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium',
                        CONFIDENCE_COLORS[tier],
                      )}
                    >
                      {Math.round(item.confidence * 100)}%
                    </span>
                  </div>
                </td>
                <td className={cn(colAuthor.td, 'hidden xl:table-cell')}>
                  <div className={colAuthor.cell}>
                    <span className="text-xs">{authorName}</span>
                  </div>
                </td>
                <td className={colStatus.td}>
                  <div className={colStatus.cell}>
                    <span
                      className={cn(
                        'inline-flex shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium',
                        STATUS_COLORS[status] ?? '',
                      )}
                    >
                      {t(`moderationStatus.${status}`, status)}
                    </span>
                  </div>
                </td>
                <td className={cn(colTime.td, 'hidden xl:table-cell')}>
                  <div className={colTime.cell}>
                    <span className="text-muted-foreground text-xs">
                      {formatDate(item.createdAt, locale)}
                    </span>
                  </div>
                </td>
                <td className={colActions.td}>
                  <div className={colActions.cell}>
                    {isActionableModerationStatus(status) ? (
                      <Link href={`/reports/moderation/${item.id}`} className="inline-flex">
                        <Button variant="primary" className={adminTable.actionBtn}>
                          {t('moderation.review')}
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/reports/moderation/${item.id}`} className="inline-flex">
                        <Button variant="secondary" className={adminTable.actionBtn}>
                          {t('moderation.detail')}
                        </Button>
                      </Link>
                    )}
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

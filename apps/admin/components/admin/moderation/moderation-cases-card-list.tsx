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

type Props = {
  cases: ModerationCaseDto[];
  locale: string;
};

function formatCaseDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'vi-VN');
}

export function ModerationCasesCardList({ cases, locale }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 lg:hidden">
      {cases.map((item) => {
        const isHighPriority = (item.reportCount ?? 0) >= CASE_ESCALATE_THRESHOLD;
        const authorUsername = item.author?.username ?? t('common.unknownUser');

        return (
          <div
            key={item.id}
            className={`space-y-3 rounded-xl border border-border bg-card p-4 transition-colors ${
              isHighPriority ? 'border-red-500/20 bg-red-500/5' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {t(`targetType.${item.targetType}`, item.targetType)}
              </span>
              <span
                className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${CASE_STATUS_COLORS[item.status] ?? ''}`}
              >
                {t(`caseStatus.${item.status}`, item.status)}
              </span>
            </div>

            {item.targetPreview ? (
              <p className="line-clamp-2 rounded-lg bg-muted/30 p-2 text-xs italic text-muted-foreground">
                &ldquo;{item.targetPreview}&rdquo;
              </p>
            ) : null}

            <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 text-xs">
              <span
                className={`inline-flex w-fit shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${TRIGGER_COLORS[item.trigger] ?? ''}`}
              >
                {t(`moderationTrigger.${item.trigger}`, item.trigger)}
              </span>
              <div className="flex items-center justify-end gap-1.5 text-muted-foreground">
                <span>{t('moderation.reportCountLabel')}:</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                    isHighPriority
                      ? 'bg-red-500/20 text-red-700 dark:text-red-400'
                      : 'bg-zinc-500/20 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {item.reportCount || 1}
                </span>
              </div>
            </div>

            {(item.slaBreached || item.hasPendingAppeal) && (
              <div className="flex flex-wrap gap-1.5">
                {item.slaBreached ? (
                  <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                    SLA
                  </span>
                ) : null}
                {item.hasPendingAppeal ? (
                  <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                    {t('moderation.appealBadge')}
                  </span>
                ) : null}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2 text-xs text-muted-foreground">
              <span className="min-w-0 truncate">@{authorUsername}</span>
              <span className="shrink-0">{formatCaseDate(item.openedAt, locale)}</span>
            </div>

            <div className="flex gap-2 pt-1">
              <Link href={`/moderation/cases/${item.id}`} className="flex-1">
                <Button className="h-9 w-full text-xs" variant="secondary">
                  {t('moderation.detail')}
                </Button>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

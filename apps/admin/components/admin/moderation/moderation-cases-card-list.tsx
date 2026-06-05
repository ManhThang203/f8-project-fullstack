'use client';

import type { ModerationCaseDto } from '@costy/shared';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import {
  confidenceTier,
  CONFIDENCE_COLORS,
  LABEL_COLORS,
  STATUS_COLORS,
  type ModerationCaseStatus,
  type ModerationLabel,
} from '@/components/admin/moderation/moderation.constants';
import { Button } from '@/components/shared/button';
import { cn } from '@/lib/utils';

type Props = {
  cases: ModerationCaseDto[];
  locale: string;
};

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'vi-VN');
}

export function ModerationCasesCardList({ cases, locale }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 lg:hidden">
      {cases.map((item) => {
        const label = item.label as ModerationLabel;
        const status = item.status as ModerationCaseStatus;
        const tier = confidenceTier(item.confidence);

        return (
          <div
            key={item.id}
            className={cn(
              'space-y-3 rounded-xl border border-border bg-card p-4',
              item.autoHidden && 'border-orange-500/20 bg-orange-500/5',
            )}
          >
            <div className="grid grid-cols-[1fr_auto] items-center gap-2">
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {t(`targetType.${item.targetType}`, item.targetType)}
              </span>
              <span
                className={cn(
                  'shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium',
                  STATUS_COLORS[status] ?? '',
                )}
              >
                {t(`moderationStatus.${status}`, status)}
              </span>
            </div>

            {item.targetPreview ? (
              <p className="line-clamp-2 rounded-lg bg-muted/30 p-2 text-xs italic text-muted-foreground">
                &ldquo;{item.targetPreview}&rdquo;
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-center gap-2">
              <span
                className={cn(
                  'inline-flex shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium',
                  LABEL_COLORS[label] ?? '',
                )}
              >
                {t(`moderationLabel.${label}`, label)}
              </span>
              <span
                className={cn(
                  'inline-flex shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium',
                  CONFIDENCE_COLORS[tier],
                )}
              >
                {Math.round(item.confidence * 100)}%
              </span>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              {item.author?.username ?? t('common.unknownUser')} · {formatDate(item.createdAt, locale)}
            </p>

            <Link href={`/reports/moderation/${item.id}`} className="block">
              <Button variant="primary" className="h-9 w-full">
                {t('moderation.review')}
              </Button>
            </Link>
          </div>
        );
      })}
    </div>
  );
}

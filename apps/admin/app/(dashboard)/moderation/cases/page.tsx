'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ModerationCasesCardList } from '@/components/admin/moderation/moderation-cases-card-list';
import { ModerationCasesTable } from '@/components/admin/moderation/moderation-cases-table';
import { ModerationStatusTabs } from '@/components/admin/moderation/moderation-status-tabs';
import { CursorPagination } from '@/components/shared/cursor-pagination';
import { Skeleton } from '@/components/shared/skeleton';
import { useModerationCases } from '@/hooks/queries/use-admin-queries';
import { useCursorPagination } from '@/hooks/use-cursor-pagination';

export default function ModerationCasesPage() {
  const { t, i18n } = useTranslation();

  const [statusFilter, setStatusFilter] = useState<string>('OPEN');

  const { limit, setLimit, cursor, pageIndex, handleNext, handlePrev } = useCursorPagination(20);

  const { data, isLoading } = useModerationCases({
    status: statusFilter || undefined,
    cursor: cursor || undefined,
    limit,
  });

  const cases = data?.data ?? [];
  const nextCursor = data?.meta?.nextCursor;
  const skeletonRows = Math.min(limit, 8);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t('moderation.pageTitle')}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground md:block">
            {t('moderation.pageSubtitle')}
          </p>
        </div>
      </div>

      <ModerationStatusTabs
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        className="max-w-full shrink-0"
      />

      {isLoading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: skeletonRows }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {cases.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center">
              <p className="text-sm text-muted-foreground">{t('moderation.empty')}</p>
            </div>
          ) : (
            <>
              <ModerationCasesTable cases={cases} locale={i18n.language} />
              <ModerationCasesCardList cases={cases} locale={i18n.language} />
            </>
          )}

          {cases.length > 0 && (
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

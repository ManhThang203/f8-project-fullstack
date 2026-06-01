'use client';

import { useTranslation } from 'react-i18next';

import { CursorPagination } from '@/components/shared/cursor-pagination';
import { Skeleton } from '@/components/shared/skeleton';
import { useAuditLogs } from '@/hooks/queries/use-admin-queries';
import { useCursorPagination } from '@/hooks/use-cursor-pagination';

export default function AuditPage() {
  const { t, i18n } = useTranslation();

  const { limit, setLimit, cursor, pageIndex, handleNext, handlePrev } = useCursorPagination(10);

  const { data, isLoading } = useAuditLogs(cursor, limit);

  const auditLogs = data?.data ?? [];
  const nextCursor = data?.meta?.nextCursor;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t('audit.title')}</h2>

      {isLoading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card px-4 py-3 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-lg border border-border bg-card px-4 py-3 text-sm"
              >
                <p className="font-medium">
                  {log.action} · {log.targetType}/{log.targetId}
                </p>
                <p className="text-xs text-muted-foreground">
                  @{log.actor?.username ?? log.actorId} ·{' '}
                  {new Date(log.createdAt).toLocaleString(
                    i18n.language === 'en' ? 'en-US' : 'vi-VN',
                  )}
                </p>
              </div>
            ))}
          </div>
          <CursorPagination
            limit={limit}
            onLimitChange={setLimit}
            hasMore={!!nextCursor}
            pageIndex={pageIndex}
            onPrev={handlePrev}
            onNext={() => handleNext(nextCursor)}
          />
        </>
      )}
    </div>
  );
}

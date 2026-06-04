'use client';

import { useTranslation } from 'react-i18next';

import { CursorPagination } from '@/components/shared/cursor-pagination';
import { Skeleton } from '@/components/shared/skeleton';
import { useAuditLogs } from '@/hooks/queries/use-admin-queries';
import { useCursorPagination } from '@/hooks/use-cursor-pagination';
import { AUDIT_ACTION_KEY_MAP, renderAuditMetadata } from '@/lib/display-labels';

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
                className="rounded-lg border border-border bg-card px-4 py-3 text-sm space-y-1.5"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                    {t(AUDIT_ACTION_KEY_MAP[log.action] ?? `auditAction.${log.action}`, log.action)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    · {t(`targetType.${log.targetType}`, log.targetType)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  @{log.actor?.username ?? t('common.unknownUser')} ·{' '}
                  {new Date(log.createdAt).toLocaleString(
                    i18n.language === 'en' ? 'en-US' : 'vi-VN',
                  )}
                </p>
                {(() => {
                  const metadataItems = renderAuditMetadata(log.metadata, t);
                  return metadataItems.length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-muted-foreground/60 hover:text-muted-foreground">
                        {t('common.details')}
                      </summary>
                      <div className="mt-1 rounded bg-muted/30 p-2 text-xs space-y-1 max-h-36 overflow-auto">
                        {metadataItems.map((item, idx) => (
                          <div key={idx} className="flex gap-2">
                            <span className="font-semibold text-muted-foreground">{item.label}:</span>
                            <span className="text-foreground break-all">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })()}
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

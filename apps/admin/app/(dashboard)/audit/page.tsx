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
            <div key={i} className="border-border bg-card space-y-2 rounded-lg border px-4 py-3">
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
                className="border-border bg-card space-y-1.5 rounded-lg border px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-muted rounded px-1.5 py-0.5 text-xs font-medium">
                    {t(AUDIT_ACTION_KEY_MAP[log.action] ?? `auditAction.${log.action}`, log.action)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    · {t(`targetType.${log.targetType}`, log.targetType)}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">
                  @{log.actor?.username ?? t('common.unknownUser')} ·{' '}
                  {new Date(log.createdAt).toLocaleString(
                    i18n.language === 'en' ? 'en-US' : 'vi-VN',
                  )}
                </p>
                {(() => {
                  const metadataItems = renderAuditMetadata(log.metadata, t);
                  return (
                    metadataItems.length > 0 && (
                      <details className="mt-1">
                        <summary className="text-muted-foreground/60 hover:text-muted-foreground cursor-pointer text-xs">
                          {t('common.details')}
                        </summary>
                        <div className="bg-muted/30 mt-1 max-h-36 space-y-1 overflow-auto rounded p-2 text-xs">
                          {metadataItems.map((item, idx) => (
                            <div key={idx} className="flex gap-2">
                              <span className="text-muted-foreground font-semibold">
                                {item.label}:
                              </span>
                              <span className="text-foreground break-all">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )
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

'use client';

import { useTranslation } from 'react-i18next';

import { LoadingState } from '@/components/shared/loading-state';
import { useAuditLogs } from '@/hooks/queries/use-admin-queries';

export default function AuditPage() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useAuditLogs();

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t('audit.title')}</h2>
      <div className="space-y-2">
        {(data?.data ?? []).map((log) => (
          <div key={log.id} className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
            <p className="font-medium">
              {log.action} · {log.targetType}/{log.targetId}
            </p>
            <p className="text-xs text-muted-foreground">
              @{log.actor?.username ?? log.actorId} ·{' '}
              {new Date(log.createdAt).toLocaleString(i18n.language === 'en' ? 'en-US' : 'vi-VN')}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

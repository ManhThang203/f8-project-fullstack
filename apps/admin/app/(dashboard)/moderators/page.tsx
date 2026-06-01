'use client';

import { useTranslation } from 'react-i18next';

import { LoadingState } from '@/components/shared/loading-state';
import { useModerators } from '@/hooks/queries/use-admin-queries';

export default function ModeratorsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useModerators();

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t('moderators.title')}</h2>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{t('common.user')}</th>
              <th className="px-4 py-3 font-medium">{t('common.role')}</th>
              <th className="px-4 py-3 font-medium">{t('moderators.permissionCount')}</th>
            </tr>
          </thead>
          <tbody>
            {(data?.data ?? []).map((mod) => (
              <tr key={mod.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{mod.name ?? mod.username}</p>
                  <p className="text-xs text-muted-foreground">@{mod.username}</p>
                </td>
                <td className="px-4 py-3">{mod.role}</td>
                <td className="px-4 py-3">{mod.permissionCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">{t('moderators.hint')}</p>
    </div>
  );
}

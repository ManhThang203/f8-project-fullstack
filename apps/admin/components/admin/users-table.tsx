'use client';

import type { AdminUserListItemDto } from '@costy/shared';
import { useTranslation } from 'react-i18next';

import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/shared/button';
import { LoadingState } from '@/components/shared/loading-state';
import { usePatchUserStatus } from '@/hooks/queries/use-admin-queries';
import { cn } from '@/lib/utils';

type Props = {
  users: AdminUserListItemDto[];
  isFetching: boolean;
};

export function UsersTable({ users, isFetching }: Props) {
  const { t } = useTranslation();
  const patchStatus = usePatchUserStatus();

  return (
    <div className="relative overflow-x-auto rounded-xl border border-border">
      {isFetching ? <LoadingState variant="overlay" /> : null}
      <table className={cn('w-full min-w-[640px] text-left text-sm', isFetching && 'opacity-60')}>
        <thead className="border-b border-border bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">{t('common.user')}</th>
            <th className="px-4 py-3 font-medium">{t('common.email')}</th>
            <th className="px-4 py-3 font-medium">{t('common.role')}</th>
            <th className="px-4 py-3 font-medium">{t('common.status')}</th>
            <th className="px-4 py-3 font-medium">{t('common.posts')}</th>
            <th className="px-4 py-3 font-medium">{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                <p className="font-medium">{user.name ?? user.username}</p>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{user.email ?? '—'}</td>
              <td className="px-4 py-3">{user.role}</td>
              <td className="px-4 py-3">
                <StatusBadge status={user.status} />
              </td>
              <td className="px-4 py-3">{user.postCount}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {user.status === 'ACTIVE' ? (
                    <Button
                      variant="secondary"
                      className="min-h-9 px-2 text-xs"
                      onClick={() =>
                        patchStatus.mutate({
                          id: user.id,
                          action: 'lock',
                          reason: t('users.lockReason'),
                        })
                      }
                    >
                      {t('users.lock')}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      className="min-h-9 px-2 text-xs"
                      onClick={() =>
                        patchStatus.mutate({
                          id: user.id,
                          action: 'unlock',
                          reason: t('users.unlockReason'),
                        })
                      }
                    >
                      {t('users.unlock')}
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

'use client';

import type { AdminUserListItemDto } from '@costy/shared';
import { useTranslation } from 'react-i18next';

import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/shared/button';
import { LoadingState } from '@/components/shared/loading-state';
import { adminTable } from '@/lib/admin-table';
import { cn } from '@/lib/utils';

type Props = {
  users: AdminUserListItemDto[];
  isFetching: boolean;
  onManageStatus: (user: AdminUserListItemDto) => void;
};

export function UsersTable({ users, isFetching, onManageStatus }: Props) {
  const { t } = useTranslation();

  return (
    <div className={adminTable.wrapRelative}>
      {isFetching ? <LoadingState variant="overlay" /> : null}
      <table
        className={cn(adminTable.table, 'min-w-[640px]', isFetching && 'opacity-60')}
      >
        <thead className={adminTable.theadAlt}>
          <tr>
            <th className={cn(adminTable.th, adminTable.thLeft)}>{t('common.user')}</th>
            <th className={cn(adminTable.th, adminTable.thLeft, 'hidden xl:table-cell')}>
              {t('common.email')}
            </th>
            <th className={cn(adminTable.th, adminTable.thLeft)}>{t('common.role')}</th>
            <th className={cn(adminTable.th, adminTable.thLeft)}>{t('common.status')}</th>
            <th className={cn(adminTable.th, adminTable.thCenter, 'hidden xl:table-cell')}>
              {t('common.posts')}
            </th>
            <th className={cn(adminTable.th, adminTable.thRight)}>{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className={adminTable.row}>
              <td className={adminTable.td}>
                <div className={adminTable.cellColStart}>
                  <p className="truncate font-medium">{user.name ?? user.username}</p>
                  <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground xl:hidden">
                    {user.email ?? '—'} · {t('users.postsCount', { count: user.postCount })}
                  </p>
                </div>
              </td>
              <td
                className={cn(
                  adminTable.td,
                  'hidden max-w-[200px] truncate text-muted-foreground xl:table-cell',
                )}
              >
                <div className={adminTable.cellStart}>{user.email ?? '—'}</div>
              </td>
              <td className={cn(adminTable.td, 'whitespace-nowrap')}>
                <div className={adminTable.cellStart}>
                  {t(`roles.${user.role}`, user.role)}
                </div>
              </td>
              <td className={adminTable.td}>
                <div className={adminTable.cellStart}>
                  <StatusBadge status={user.status} />
                </div>
              </td>
              <td className={cn(adminTable.tdCenter, 'hidden xl:table-cell')}>
                <div className={adminTable.cellCenter}>{user.postCount}</div>
              </td>
              <td className={adminTable.tdRight}>
                <div className={adminTable.cellEnd}>
                  <Button
                    variant="secondary"
                    className={adminTable.actionBtn}
                    onClick={() => onManageStatus(user)}
                  >
                    {t('users.manageStatus')}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

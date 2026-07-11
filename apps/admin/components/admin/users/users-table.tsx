'use client';

import type { AdminUserListItemDto, Role } from '@costy/shared';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { isRoleChangeDisabled, isStatusChangeDisabled } from './users.utils';

import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/shared/button';
import { LoadingState } from '@/components/shared/loading-state';
import { adminCol, adminTable } from '@/lib/admin-table';
import { cn } from '@/lib/utils';

type Props = {
  users: AdminUserListItemDto[];
  isFetching: boolean;
  canManageRole?: boolean;
  canManageStatus?: boolean;
  currentUserId?: string;
  currentUserRole?: Role;
  onManageStatus: (user: AdminUserListItemDto) => void;
  onManageRole?: (user: AdminUserListItemDto) => void;
};

const colUser = adminCol('grow', 'start');
const colEmail = adminCol('grow', 'center');
const colRole = adminCol('grow', 'center');
const colStatus = adminCol('grow', 'center');
const colPosts = adminCol('grow', 'center');
const colActions = adminCol('actions', 'end');

export function UsersTable({
  users,
  isFetching,
  canManageRole = false,
  canManageStatus = false,
  currentUserId,
  currentUserRole,
  onManageStatus,
  onManageRole,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className={adminTable.wrapRelative}>
      {isFetching ? <LoadingState variant="overlay" /> : null}
      <table className={cn(adminTable.table, 'min-w-[640px]', isFetching && 'opacity-60')}>
        <thead className={adminTable.theadAlt}>
          <tr>
            <th className={colUser.th}>{t('common.user')}</th>
            <th className={cn(colEmail.th, 'hidden xl:table-cell')}>{t('common.email')}</th>
            <th className={colRole.th}>{t('common.role')}</th>
            <th className={colStatus.th}>{t('common.status')}</th>
            <th className={cn(colPosts.th, 'hidden xl:table-cell')}>{t('common.posts')}</th>
            <th className={colActions.th}>{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className={adminTable.row}>
              <td className={colUser.td}>
                <div className={colUser.cell}>
                  <p className="truncate font-medium">{user.name ?? user.username}</p>
                  <p className="text-muted-foreground truncate text-xs">@{user.username}</p>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs xl:hidden">
                    {user.email ?? '—'} · {t('users.postsCount', { count: user.postCount })}
                  </p>
                </div>
              </td>
              <td
                className={cn(
                  colEmail.td,
                  'text-muted-foreground hidden max-w-[200px] truncate xl:table-cell',
                )}
              >
                <div className={colEmail.cell}>{user.email ?? '—'}</div>
              </td>
              <td className={cn(colRole.td, 'whitespace-nowrap')}>
                <div className={colRole.cell}>{t(`roles.${user.role}`, user.role)}</div>
              </td>
              <td className={colStatus.td}>
                <div className={colStatus.cell}>
                  <StatusBadge status={user.status} />
                </div>
              </td>
              <td className={cn(colPosts.td, 'hidden xl:table-cell')}>
                <div className={colPosts.cell}>{user.postCount}</div>
              </td>
              <td className={colActions.td}>
                <div className={cn(colActions.cell, 'flex flex-wrap justify-end gap-2')}>
                  {canManageRole && onManageRole ? (
                    <Button
                      variant="secondary"
                      disabled={isRoleChangeDisabled(user, currentUserId, currentUserRole)}
                      className={cn(adminTable.actionBtn, 'gap-1.5 leading-none')}
                      onClick={() => onManageRole(user)}
                    >
                      <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
                      {t('users.manageRole')}
                    </Button>
                  ) : null}
                  {canManageStatus &&
                  !isStatusChangeDisabled(user, currentUserId, currentUserRole) ? (
                    <Button
                      variant="secondary"
                      className={adminTable.actionBtn}
                      onClick={() => onManageStatus(user)}
                    >
                      {t('users.manageStatus')}
                    </Button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

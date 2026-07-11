'use client';

import type { AdminUserListItemDto, Role } from '@costy/shared';
import { useTranslation } from 'react-i18next';

import { isRoleChangeDisabled, isStatusChangeDisabled } from './users.utils';

import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/shared/button';

type Props = {
  users: AdminUserListItemDto[];
  canManageRole?: boolean;
  canManageStatus?: boolean;
  currentUserId?: string;
  currentUserRole?: Role;
  onManageStatus: (user: AdminUserListItemDto) => void;
  onManageRole?: (user: AdminUserListItemDto) => void;
};

export function UsersCardList({
  users,
  canManageRole = false,
  canManageStatus = false,
  currentUserId,
  currentUserRole,
  onManageStatus,
  onManageRole,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 lg:hidden">
      {users.map((user) => (
        <div key={user.id} className="border-border bg-card space-y-3 rounded-xl border p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{user.name ?? user.username}</p>
              <p className="text-muted-foreground truncate text-xs">@{user.username}</p>
            </div>
            <StatusBadge status={user.status} className="shrink-0" />
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-xs">
            <span className="text-foreground truncate whitespace-nowrap">
              {t(`roles.${user.role}`, user.role)}
            </span>
            <span className="text-muted-foreground shrink-0">
              {t('users.postsCount', { count: user.postCount })}
            </span>
          </div>

          <p className="text-muted-foreground truncate text-xs">{user.email ?? '—'}</p>

          <div className="flex flex-col gap-2">
            {canManageRole && onManageRole ? (
              <Button
                variant="secondary"
                className="h-9 w-full text-xs"
                disabled={isRoleChangeDisabled(user, currentUserId, currentUserRole)}
                onClick={() => onManageRole(user)}
              >
                {t('users.manageRole')}
              </Button>
            ) : null}
            {canManageStatus &&
            !isStatusChangeDisabled(user, currentUserId, currentUserRole) ? (
              <Button
                variant="secondary"
                className="h-9 w-full text-xs"
                onClick={() => onManageStatus(user)}
              >
                {t('users.manageStatus')}
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

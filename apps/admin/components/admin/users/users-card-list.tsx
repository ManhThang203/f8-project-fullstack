'use client';

import type { AdminUserListItemDto } from '@costy/shared';
import { useTranslation } from 'react-i18next';

import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/shared/button';

type Props = {
  users: AdminUserListItemDto[];
  onManageStatus: (user: AdminUserListItemDto) => void;
};

export function UsersCardList({ users, onManageStatus }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 lg:hidden">
      {users.map((user) => (
        <div
          key={user.id}
          className="space-y-3 rounded-xl border border-border bg-card p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{user.name ?? user.username}</p>
              <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
            </div>
            <StatusBadge status={user.status} className="shrink-0" />
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-xs">
            <span className="truncate whitespace-nowrap text-foreground">
              {t(`roles.${user.role}`, user.role)}
            </span>
            <span className="shrink-0 text-muted-foreground">
              {t('users.postsCount', { count: user.postCount })}
            </span>
          </div>

          <p className="truncate text-xs text-muted-foreground">{user.email ?? '—'}</p>

          <Button
            variant="secondary"
            className="h-9 w-full text-xs"
            onClick={() => onManageStatus(user)}
          >
            {t('users.manageStatus')}
          </Button>
        </div>
      ))}
    </div>
  );
}

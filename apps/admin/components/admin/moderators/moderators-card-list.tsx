'use client';

import type { AdminModeratorDto } from '@costy/shared';
import { Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/button';

type Props = {
  moderators: AdminModeratorDto[];
  onEditPermissions: (mod: AdminModeratorDto) => void;
};

/** Hiển thị nhãn số quyền hoặc toàn quyền cho moderator. */
function PermissionChip({ count }: { count: number }) {
  const { t } = useTranslation();

  const label =
    count === 999
      ? `★ ${t('account.allPermissions')}`
      : t('moderators.permissionCountValue', { count });

  return (
    <span className="bg-muted text-muted-foreground ring-border inline-flex items-center whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset">
      {label}
    </span>
  );
}

export function ModeratorsCardList({ moderators, onEditPermissions }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 lg:hidden">
      {moderators.map((mod) => (
        <div key={mod.id} className="border-border bg-card space-y-3 rounded-xl border p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{mod.name ?? mod.username}</p>
              <p className="text-muted-foreground truncate text-xs">@{mod.username}</p>
            </div>
            <span className="bg-muted text-foreground shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold">
              {t(`roles.${mod.role}`, mod.role)}
            </span>
          </div>

          <PermissionChip count={mod.permissionCount} />

          <Button
            variant="secondary"
            disabled={mod.role === 'SUPER_ADMIN'}
            onClick={() => onEditPermissions(mod)}
            className="h-9 w-full gap-1.5 text-xs"
          >
            <Key className="size-3.5 shrink-0" aria-hidden />
            {t('moderators.editPermissions')}
          </Button>
        </div>
      ))}
    </div>
  );
}

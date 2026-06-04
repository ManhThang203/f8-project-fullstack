'use client';

import type { AdminModeratorDto } from '@costy/shared';
import { Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/button';
import { adminTable } from '@/lib/admin-table';
import { cn } from '@/lib/utils';

type Props = {
  moderators: AdminModeratorDto[];
  onEditPermissions: (mod: AdminModeratorDto) => void;
};

/** Hiển thị nhãn số quyền hoặc toàn quyền cho moderator. */
function PermissionLabel({ count }: { count: number }) {
  const { t } = useTranslation();

  if (count === 999) {
    return (
      <span className="whitespace-nowrap">
        ★ {t('account.allPermissions')}
      </span>
    );
  }

  return (
    <span className="whitespace-nowrap">
      {t('moderators.permissionCountValue', { count })}
    </span>
  );
}

export function ModeratorsTable({ moderators, onEditPermissions }: Props) {
  const { t } = useTranslation();

  return (
    <div className={cn(adminTable.wrap, 'overflow-x-auto')}>
      <table className={cn(adminTable.table, 'min-w-[480px]')}>
        <thead className={adminTable.theadAlt}>
          <tr>
            <th className={cn(adminTable.th, adminTable.thLeft)}>{t('common.user')}</th>
            <th className={cn(adminTable.th, adminTable.thLeft)}>{t('common.role')}</th>
            <th className={cn(adminTable.th, adminTable.thLeft)}>
              {t('moderators.permissionCount')}
            </th>
            <th className={cn(adminTable.th, adminTable.thRight)}>{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {moderators.map((mod) => (
            <tr key={mod.id} className={adminTable.row}>
              <td className={adminTable.td}>
                <div className={adminTable.cellColStart}>
                  <p className="truncate font-medium">{mod.name ?? mod.username}</p>
                  <p className="truncate text-xs text-muted-foreground">@{mod.username}</p>
                </div>
              </td>
              <td className={cn(adminTable.td, 'whitespace-nowrap')}>
                <div className={adminTable.cellStart}>
                  <span className="font-semibold">{t(`roles.${mod.role}`, mod.role)}</span>
                </div>
              </td>
              <td className={adminTable.td}>
                <div className={adminTable.cellStart}>
                  <span className="inline-flex items-center whitespace-nowrap rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border">
                    <PermissionLabel count={mod.permissionCount} />
                  </span>
                </div>
              </td>
              <td className={adminTable.tdRight}>
                <div className={adminTable.cellEnd}>
                  <Button
                    variant="ghost"
                    disabled={mod.role === 'SUPER_ADMIN'}
                    onClick={() => onEditPermissions(mod)}
                    className="min-h-9 h-9 gap-1.5 px-3 text-xs leading-none text-primary hover:bg-primary hover:text-primary-foreground disabled:text-muted-foreground disabled:hover:bg-transparent"
                  >
                    <Key className="size-3.5 shrink-0 text-primary" aria-hidden />
                    {t('moderators.editPermissions')}
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

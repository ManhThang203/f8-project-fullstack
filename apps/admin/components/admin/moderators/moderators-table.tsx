'use client';

import type { AdminModeratorDto } from '@costy/shared';
import { Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/button';
import { adminCol, adminTable } from '@/lib/admin-table';
import { cn } from '@/lib/utils';

type Props = {
  moderators: AdminModeratorDto[];
  onEditPermissions: (mod: AdminModeratorDto) => void;
};

const colUser = adminCol('grow', 'start');
const colRole = adminCol('grow', 'center');
const colPermissions = adminCol('grow', 'center');
const colActions = adminCol('actions', 'end');

/** Hiển thị nhãn số quyền hoặc toàn quyền cho moderator. */
function PermissionLabel({ count }: { count: number }) {
  const { t } = useTranslation();

  if (count === 999) {
    return <span className="whitespace-nowrap">★ {t('account.allPermissions')}</span>;
  }

  return (
    <span className="whitespace-nowrap">{t('moderators.permissionCountValue', { count })}</span>
  );
}

/** Chỉ MODERATOR mới được chỉnh quyền chi tiết. */
function canEditPermissions(role: AdminModeratorDto['role']): boolean {
  return role === 'MODERATOR';
}

export function ModeratorsTable({ moderators, onEditPermissions }: Props) {
  const { t } = useTranslation();

  return (
    <div className={cn(adminTable.wrap, 'overflow-x-auto')}>
      <table className={cn(adminTable.table, 'min-w-[480px]')}>
        <thead className={adminTable.theadAlt}>
          <tr>
            <th className={colUser.th}>{t('common.user')}</th>
            <th className={colRole.th}>{t('common.role')}</th>
            <th className={colPermissions.th}>{t('moderators.permissionCount')}</th>
            <th className={colActions.th}>{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {moderators.map((mod) => (
            <tr key={mod.id} className={adminTable.row}>
              <td className={colUser.td}>
                <div className={colUser.cell}>
                  <p className="truncate font-medium">{mod.name ?? mod.username}</p>
                  <p className="text-muted-foreground truncate text-xs">@{mod.username}</p>
                </div>
              </td>
              <td className={cn(colRole.td, 'whitespace-nowrap')}>
                <div className={colRole.cell}>
                  <span className="font-semibold">{t(`roles.${mod.role}`, mod.role)}</span>
                </div>
              </td>
              <td className={colPermissions.td}>
                <div className={colPermissions.cell}>
                  <span className="bg-muted text-muted-foreground ring-border inline-flex items-center whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset">
                    <PermissionLabel count={mod.permissionCount} />
                  </span>
                </div>
              </td>
              <td className={colActions.td}>
                <div className={colActions.cell}>
                  <Button
                    variant="secondary"
                    disabled={!canEditPermissions(mod.role)}
                    onClick={() => onEditPermissions(mod)}
                    className={cn(adminTable.actionBtn, 'gap-1.5 leading-none')}
                  >
                    <Key className="size-3.5 shrink-0" aria-hidden />
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

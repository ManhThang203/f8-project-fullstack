'use client';

import type { AdminModeratorDto } from '@costy/shared';
import { Key } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EditPermissionsModal } from '@/components/admin/edit-permissions-modal';
import { Button } from '@/components/shared/button';
import { CursorPagination } from '@/components/shared/cursor-pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { useModerators } from '@/hooks/queries/use-admin-queries';
import { useCursorPagination } from '@/hooks/use-cursor-pagination';

export default function ModeratorsPage() {
  const { t } = useTranslation();

  const { limit, setLimit, cursor, pageIndex, handleNext, handlePrev } = useCursorPagination(10);

  const { data, isLoading } = useModerators(cursor, limit);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminModeratorDto | null>(null);

  const moderators = data?.data ?? [];
  const nextCursor = data?.meta?.nextCursor;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t('moderators.title')}</h2>

      {isLoading && !data ? (
        <TableSkeleton rows={limit} cols={4} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t('common.user')}</th>
                  <th className="px-4 py-3 font-medium">{t('common.role')}</th>
                  <th className="px-4 py-3 font-medium">{t('moderators.permissionCount')}</th>
                  <th className="px-4 py-3 font-medium text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {moderators.map((mod) => (
                  <tr key={mod.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{mod.name ?? mod.username}</p>
                      <p className="text-xs text-muted-foreground">@{mod.username}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{mod.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border">
                        {mod.permissionCount === 999 ? '★ ' + t('account.allPermissions') : `${mod.permissionCount} quyền`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        disabled={mod.role === 'SUPER_ADMIN'}
                        onClick={() => {
                          setSelectedUser(mod);
                          setIsModalOpen(true);
                        }}
                        className="min-h-9 min-w-9 h-9 gap-1.5 px-3 text-xs text-primary hover:bg-primary hover:text-primary-foreground disabled:text-muted-foreground disabled:hover:bg-transparent"
                      >
                        <Key className="size-3.5" />
                        {t('moderators.editPermissions')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CursorPagination
            limit={limit}
            onLimitChange={setLimit}
            hasMore={!!nextCursor}
            pageIndex={pageIndex}
            onPrev={handlePrev}
            onNext={() => handleNext(nextCursor)}
          />
        </>
      )}

      <EditPermissionsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
      />
    </div>
  );
}

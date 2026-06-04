'use client';

import type { AdminModeratorDto } from '@costy/shared';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EditPermissionsModal } from '@/components/admin/edit-permissions-modal';
import { ModeratorsCardList } from '@/components/admin/moderators/moderators-card-list';
import { ModeratorsCardSkeleton } from '@/components/admin/moderators/moderators-card-skeleton';
import { ModeratorsTable } from '@/components/admin/moderators/moderators-table';
import { ModeratorsTableSkeleton } from '@/components/admin/moderators/moderators-table-skeleton';
import { CursorPagination } from '@/components/shared/cursor-pagination';
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
  const skeletonRows = Math.min(limit, 8);

  /** Mở modal sửa quyền cho moderator được chọn. */
  const handleEditPermissions = useCallback((mod: AdminModeratorDto) => {
    setSelectedUser(mod);
    setIsModalOpen(true);
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t('moderators.title')}</h2>

      {isLoading && !data ? (
        <>
          <ModeratorsTableSkeleton rows={skeletonRows} />
          <ModeratorsCardSkeleton rows={Math.min(limit, 5)} />
        </>
      ) : (
        <>
          <ModeratorsTable moderators={moderators} onEditPermissions={handleEditPermissions} />
          <ModeratorsCardList moderators={moderators} onEditPermissions={handleEditPermissions} />
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

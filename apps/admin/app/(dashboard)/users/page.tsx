'use client';

import { X } from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BanUserModal } from '@/components/admin/ban-user-modal';
import { ChangeRoleModal } from '@/components/admin/change-role-modal';
import { UsersCardList } from '@/components/admin/users/users-card-list';
import { UsersCardSkeleton } from '@/components/admin/users/users-card-skeleton';
import { UsersTable } from '@/components/admin/users/users-table';
import { UsersTableSkeleton } from '@/components/admin/users/users-table-skeleton';
import { isRoleChangeDisabled } from '@/components/admin/users/users.utils';
import { CursorPagination } from '@/components/shared/cursor-pagination';
import { useDebounce } from '@/hooks/use-debounce';
import { useAdminMe, useAdminUsers } from '@/hooks/queries/use-admin-queries';
import { useCursorPagination } from '@/hooks/use-cursor-pagination';
import { hasAdminPermission } from '@/lib/has-admin-permission';
import { cn } from '@/lib/utils';
import type { AdminUserListItemDto, Role } from '@costy/shared';

/** Input tìm kiếm tách riêng để không re-render khi fetch danh sách. */
const UsersSearchInput = memo(function UsersSearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-11 flex-1">
      <input
        type="text"
        role="searchbox"
        placeholder={t('users.searchPlaceholder')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'border-border bg-background min-h-11 w-full rounded-lg border px-3 text-sm',
          value ? 'pr-11' : 'pr-3',
        )}
        aria-label={t('users.searchLabel')}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-muted-foreground hover:text-foreground absolute right-0 top-0 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg transition-colors"
          aria-label={t('users.clearSearch')}
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
});

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedTerm = useDebounce(searchTerm, 400);
  const [selectedUser, setSelectedUser] = useState<AdminUserListItemDto | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roleUser, setRoleUser] = useState<AdminUserListItemDto | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  const { data: meData } = useAdminMe();
  const currentUserId = meData?.data?.id;
  const permissions = meData?.data?.permissions ?? [];
  const canReadUsers = hasAdminPermission(permissions, 'user:read');
  const canManageRole = hasAdminPermission(permissions, 'moderator:manage');
  const canManageStatus = hasAdminPermission(permissions, 'user:lock');
  const currentUserIsSuperAdmin = meData?.data?.role === 'SUPER_ADMIN';
  const currentUserRole = meData?.data?.role as Role | undefined;

  const { limit, setLimit, cursor, pageIndex, handleNext, handlePrev, reset } =
    useCursorPagination(10);

  useEffect(() => {
    reset();
  }, [debouncedTerm]);

  const { data, isFetching, isLoading } = useAdminUsers(
    {
      q: debouncedTerm || undefined,
      cursor,
      limit,
    },
    { enabled: canReadUsers },
  );

  const users = data?.data ?? [];
  const nextCursor = data?.meta?.nextCursor;
  const skeletonRows = Math.min(limit, 8);

  /** Mở modal quản lý trạng thái cho user được chọn. */
  const handleManageStatus = useCallback((user: AdminUserListItemDto) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  }, []);

  /** Mở modal đổi vai trò cho user được chọn (không cho tự đổi / đụng Admin nếu không phải Super-admin). */
  const handleManageRole = useCallback(
    (user: AdminUserListItemDto) => {
      if (isRoleChangeDisabled(user, currentUserId, currentUserRole)) return;
      setRoleUser(user);
      setIsRoleModalOpen(true);
    },
    [currentUserId, currentUserRole],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <UsersSearchInput value={searchTerm} onChange={setSearchTerm} />
      </div>

      {isLoading && !data ? (
        <>
          <UsersTableSkeleton rows={skeletonRows} />
          <UsersCardSkeleton rows={Math.min(limit, 5)} />
        </>
      ) : (
        <>
          <UsersTable
            users={users}
            isFetching={isFetching && !isLoading}
            canManageRole={canManageRole}
            canManageStatus={canManageStatus}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onManageStatus={handleManageStatus}
            onManageRole={handleManageRole}
          />
          <UsersCardList
            users={users}
            canManageRole={canManageRole}
            canManageStatus={canManageStatus}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onManageStatus={handleManageStatus}
            onManageRole={handleManageRole}
          />
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

      <BanUserModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
      />

      <ChangeRoleModal
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setRoleUser(null);
        }}
        user={roleUser}
        currentUserIsSuperAdmin={currentUserIsSuperAdmin}
      />
    </div>
  );
}

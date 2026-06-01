'use client';

import { X } from 'lucide-react';
import { memo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { UsersTable } from '@/components/admin/users-table';
import { CursorPagination } from '@/components/shared/cursor-pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { useDebounce } from '@/hooks/use-debounce';
import { useAdminUsers } from '@/hooks/queries/use-admin-queries';
import { useCursorPagination } from '@/hooks/use-cursor-pagination';
import { cn } from '@/lib/utils';

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
          'min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm',
          value ? 'pr-11' : 'pr-3',
        )}
        aria-label={t('users.searchLabel')}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-0 top-0 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
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

  const { limit, setLimit, cursor, pageIndex, handleNext, handlePrev, reset } =
    useCursorPagination(10);

  useEffect(() => {
    reset();
  }, [debouncedTerm]);

  const { data, isFetching, isLoading } = useAdminUsers({
    q: debouncedTerm || undefined,
    cursor,
    limit,
  });

  const users = data?.data ?? [];
  const nextCursor = data?.meta?.nextCursor;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <UsersSearchInput value={searchTerm} onChange={setSearchTerm} />
      </div>
      {isLoading && !data ? (
        <TableSkeleton rows={limit} cols={5} />
      ) : (
        <>
          <UsersTable users={users} isFetching={isFetching && !isLoading} />
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
    </div>
  );
}

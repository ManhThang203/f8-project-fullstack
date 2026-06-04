'use client';

import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { HashtagsTable } from '@/components/admin/hashtags/hashtags-table';
import { HashtagsTableSkeleton } from '@/components/admin/hashtags/hashtags-table-skeleton';
import { CursorPagination } from '@/components/shared/cursor-pagination';
import { useAdminHashtags, usePatchHashtag } from '@/hooks/queries/use-admin-queries';
import { useCursorPagination } from '@/hooks/use-cursor-pagination';

export default function HashtagsPage() {
  const { t } = useTranslation();

  const { limit, setLimit, cursor, pageIndex, handleNext, handlePrev } = useCursorPagination(10);

  const { data, isLoading } = useAdminHashtags('7d', cursor, limit);
  const patch = usePatchHashtag();

  const hashtags = data?.data ?? [];
  const nextCursor = data?.meta?.nextCursor;

  const handleAction = (id: string, action: string) => {
    patch.mutate(
      { id, action },
      {
        onSuccess: () => {
          toast.success(t('hashtags.successUpdate'));
        },
        onError: () => {
          toast.error(t('hashtags.errorUpdate'));
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t('hashtags.title')}</h2>

      {isLoading && !data ? (
        <HashtagsTableSkeleton rows={limit} />
      ) : (
        <>
          <HashtagsTable
            hashtags={hashtags}
            isPending={patch.isPending}
            onAction={handleAction}
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
    </div>
  );
}

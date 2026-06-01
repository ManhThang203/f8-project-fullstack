'use client';

import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/shared/button';
import { CursorPagination } from '@/components/shared/cursor-pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
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
      }
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t('hashtags.title')}</h2>

      {isLoading && !data ? (
        <TableSkeleton rows={limit} cols={4} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t('hashtags.tag')}</th>
                  <th className="px-4 py-3 font-medium">{t('hashtags.posts7d')}</th>
                  <th className="px-4 py-3 font-medium">{t('common.status')}</th>
                  <th className="px-4 py-3 font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {hashtags.map((tag) => (
                  <tr key={tag.id} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        {tag.status !== 'BLOCKED' ? (
                          <button
                            type="button"
                            onClick={() => handleAction(tag.id, tag.featured ? 'unfeature' : 'feature')}
                            className="focus:outline-none transition-transform active:scale-95 cursor-pointer"
                            title={tag.featured ? t('hashtags.unfeature') : t('hashtags.feature')}
                            disabled={patch.isPending}
                          >
                            <Star
                              className={`size-4 transition-all duration-200 ${
                                tag.featured
                                  ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                                  : 'text-muted-foreground/30 hover:text-amber-400 hover:fill-amber-400/20'
                              }`}
                            />
                          </button>
                        ) : (
                          <div className="size-4" /> // Empty placeholder for alignment when blocked
                        )}
                        <span className="text-foreground">#{tag.tag}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{tag.postCount}</td>
                    <td className="px-4 py-3">
                      {tag.status === 'ACTIVE' && (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          {t('status.ACTIVE')}
                        </span>
                      )}
                      {tag.status === 'HIDDEN' && (
                        <span className="inline-flex items-center rounded-full bg-zinc-500/10 border border-zinc-500/20 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          {t('status.HIDDEN')}
                        </span>
                      )}
                      {tag.status === 'BLOCKED' && (
                        <span className="inline-flex items-center rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                          {t('status.BLOCKED')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* Nhóm Ẩn/Chặn/Kích hoạt */}
                        {tag.status === 'ACTIVE' && (
                          <>
                            <Button
                              variant="secondary"
                              className="min-h-8 min-w-auto h-8 px-2.5 text-xs font-semibold"
                              onClick={() => handleAction(tag.id, 'hide')}
                              disabled={patch.isPending}
                            >
                              {t('hashtags.hide')}
                            </Button>
                            <Button
                              variant="danger"
                              className="min-h-8 min-w-auto h-8 px-2.5 text-xs font-semibold"
                              onClick={() => handleAction(tag.id, 'block')}
                              disabled={patch.isPending}
                            >
                              {t('hashtags.block')}
                            </Button>
                          </>
                        )}

                        {tag.status === 'HIDDEN' && (
                          <>
                            <Button
                              variant="secondary"
                              className="min-h-8 min-w-auto h-8 px-2.5 text-xs font-semibold"
                              onClick={() => handleAction(tag.id, 'activate')}
                              disabled={patch.isPending}
                            >
                              {t('hashtags.activate')}
                            </Button>
                            <Button
                              variant="danger"
                              className="min-h-8 min-w-auto h-8 px-2.5 text-xs font-semibold"
                              onClick={() => handleAction(tag.id, 'block')}
                              disabled={patch.isPending}
                            >
                              {t('hashtags.block')}
                            </Button>
                          </>
                        )}

                        {tag.status === 'BLOCKED' && (
                          <>
                            <Button
                              variant="secondary"
                              className="min-h-8 min-w-auto h-8 px-2.5 text-xs font-semibold"
                              onClick={() => handleAction(tag.id, 'activate')}
                              disabled={patch.isPending}
                            >
                              {t('hashtags.activate')}
                            </Button>
                            <Button
                              variant="secondary"
                              className="min-h-8 min-w-auto h-8 px-2.5 text-xs font-semibold"
                              onClick={() => handleAction(tag.id, 'hide')}
                              disabled={patch.isPending}
                            >
                              {t('hashtags.hide')}
                            </Button>
                          </>
                        )}
                      </div>
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
    </div>
  );
}

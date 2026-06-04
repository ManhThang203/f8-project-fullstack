'use client';

import type { AdminHashtagDto } from '@costy/shared';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/button';
import { adminCol, adminTable } from '@/lib/admin-table';
import { cn } from '@/lib/utils';

type Props = {
  hashtags: AdminHashtagDto[];
  isPending: boolean;
  onAction: (id: string, action: string) => void;
};

const colTag = adminCol('grow', 'start');
const colPosts = adminCol('grow', 'center');
const colStatus = adminCol('grow', 'center');
const colActions = adminCol('actions', 'end');

export function HashtagsTable({ hashtags, isPending, onAction }: Props) {
  const { t } = useTranslation();

  return (
    <div className={cn(adminTable.wrap, 'block')}>
      <table className={cn(adminTable.table, 'min-w-[520px]')}>
        <thead className={adminTable.theadAlt}>
          <tr>
            <th className={colTag.th}>{t('hashtags.tag')}</th>
            <th className={colPosts.th}>{t('hashtags.posts7d')}</th>
            <th className={colStatus.th}>{t('common.status')}</th>
            <th className={colActions.th}>{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody className={adminTable.tbodyDivide}>
          {hashtags.map((tag) => (
            <tr key={tag.id} className={adminTable.row}>
              <td className={colTag.td}>
                <div className={colTag.cell}>
                  <div className="flex items-center justify-center gap-2">
                    {tag.status !== 'BLOCKED' ? (
                      <button
                        type="button"
                        onClick={() =>
                          onAction(tag.id, tag.featured ? 'unfeature' : 'feature')
                        }
                        className="cursor-pointer transition-transform focus:outline-none active:scale-95"
                        title={tag.featured ? t('hashtags.unfeature') : t('hashtags.feature')}
                        disabled={isPending}
                      >
                        <Star
                          className={`size-4 transition-all duration-200 ${
                            tag.featured
                              ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                              : 'text-muted-foreground hover:fill-amber-400/20 hover:text-amber-600 dark:hover:text-amber-400'
                          }`}
                        />
                      </button>
                    ) : (
                      <div className="size-4" />
                    )}
                    <span className="text-foreground font-medium">#{tag.tag}</span>
                  </div>
                </div>
              </td>
              <td className={cn(colPosts.td, 'text-muted-foreground')}>
                <div className={colPosts.cell}>{tag.postCount}</div>
              </td>
              <td className={colStatus.td}>
                <div className={colStatus.cell}>
                  {tag.status === 'ACTIVE' && (
                    <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      {t('status.ACTIVE')}
                    </span>
                  )}
                  {tag.status === 'HIDDEN' && (
                    <span className="inline-flex items-center rounded-full border border-zinc-500/20 bg-zinc-500/10 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      {t('status.HIDDEN')}
                    </span>
                  )}
                  {tag.status === 'BLOCKED' && (
                    <span className="inline-flex items-center rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                      {t('status.BLOCKED')}
                    </span>
                  )}
                </div>
              </td>
              <td className={colActions.td}>
                <div className={colActions.cell}>
                  {tag.status === 'ACTIVE' && (
                    <>
                      <Button
                        variant="secondary"
                        className="min-w-auto h-8 min-h-8 px-2.5 text-xs font-semibold"
                        onClick={() => onAction(tag.id, 'hide')}
                        disabled={isPending}
                      >
                        {t('hashtags.hide')}
                      </Button>
                      <Button
                        variant="danger"
                        className="min-w-auto h-8 min-h-8 px-2.5 text-xs font-semibold"
                        onClick={() => onAction(tag.id, 'block')}
                        disabled={isPending}
                      >
                        {t('hashtags.block')}
                      </Button>
                    </>
                  )}

                  {tag.status === 'HIDDEN' && (
                    <>
                      <Button
                        variant="secondary"
                        className="min-w-auto h-8 min-h-8 px-2.5 text-xs font-semibold"
                        onClick={() => onAction(tag.id, 'activate')}
                        disabled={isPending}
                      >
                        {t('hashtags.activate')}
                      </Button>
                      <Button
                        variant="danger"
                        className="min-w-auto h-8 min-h-8 px-2.5 text-xs font-semibold"
                        onClick={() => onAction(tag.id, 'block')}
                        disabled={isPending}
                      >
                        {t('hashtags.block')}
                      </Button>
                    </>
                  )}

                  {tag.status === 'BLOCKED' && (
                    <>
                      <Button
                        variant="secondary"
                        className="min-w-auto h-8 min-h-8 px-2.5 text-xs font-semibold"
                        onClick={() => onAction(tag.id, 'activate')}
                        disabled={isPending}
                      >
                        {t('hashtags.activate')}
                      </Button>
                      <Button
                        variant="secondary"
                        className="min-w-auto h-8 min-h-8 px-2.5 text-xs font-semibold"
                        onClick={() => onAction(tag.id, 'hide')}
                        disabled={isPending}
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
  );
}

'use client';

import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/button';
import { LoadingState } from '@/components/shared/loading-state';
import { useAdminHashtags, usePatchHashtag } from '@/hooks/queries/use-admin-queries';

export default function HashtagsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useAdminHashtags('7d');
  const patch = usePatchHashtag();

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t('hashtags.title')}</h2>
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
            {(data?.data ?? []).map((tag) => (
              <tr key={tag.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">
                  #{tag.tag}
                  {tag.featured ? (
                    <span className="ml-2 text-xs text-amber-400">{t('hashtags.featured')}</span>
                  ) : null}
                </td>
                <td className="px-4 py-3">{tag.postCount}</td>
                <td className="px-4 py-3">{tag.status}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      className="min-h-9 px-2 text-xs"
                      onClick={() => patch.mutate({ id: tag.id, action: 'feature' })}
                    >
                      {t('hashtags.feature')}
                    </Button>
                    <Button
                      variant="secondary"
                      className="min-h-9 px-2 text-xs"
                      onClick={() => patch.mutate({ id: tag.id, action: 'hide' })}
                    >
                      {t('hashtags.hide')}
                    </Button>
                    <Button
                      variant="danger"
                      className="min-h-9 px-2 text-xs"
                      onClick={() => patch.mutate({ id: tag.id, action: 'block' })}
                    >
                      {t('hashtags.block')}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

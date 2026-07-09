'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { toast } from 'sonner';

import { FeedSkeletonList } from '@/components/home/feed/feed-skeleton-list';
import { PostCard } from '@/components/home/post/card';
import { Button } from '@/components/shared/ui';
import { flattenSavedPages, useSavedPosts } from '@/hooks/queries/posts';
import { getUserFacingErrorMessage } from '@/lib/api';

/** Feed bài viết đã lưu với infinite scroll (Virtuoso). */
export function SavedFeed() {
  const { data, isLoading, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSavedPosts();

  const posts = useMemo(() => flattenSavedPages(data?.pages), [data?.pages]);

  useEffect(() => {
    if (!isError) return;
    toast.error(getUserFacingErrorMessage(error));
  }, [isError, error]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) return <FeedSkeletonList />;

  if (isError) {
    return (
      <div className="space-y-3 py-8 text-center" role="alert">
        <p className="text-muted-foreground text-sm">{getUserFacingErrorMessage(error)}</p>
        <Button variant="secondary" size="md" onClick={() => void refetch()}>
          Thử lại
        </Button>
      </div>
    );
  }
  if (posts.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Bạn chưa lưu bài viết nào. Nhấn Lưu trên bài viết để xem tại đây.
      </p>
    );
  }

  return (
    <Virtuoso
      useWindowScroll
      data={posts}
      computeItemKey={(_, post) => post.id}
      endReached={handleEndReached}
      overscan={600}
      itemContent={(_, post) => <PostCard post={post} onDismiss={() => {}} hideDismiss />}
      components={{
        Footer: () => (
          <div className="flex min-h-11 items-center justify-center py-4">
            {isFetchingNextPage ? (
              <p className="text-muted-foreground text-sm" aria-live="polite">
                Đang tải thêm…
              </p>
            ) : null}
          </div>
        ),
      }}
    />
  );
}

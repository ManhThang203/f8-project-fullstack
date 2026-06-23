'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Virtuoso } from 'react-virtuoso';
import { FeedSkeletonList } from '@/components/home/feed/feed-skeleton-list';
import { PostCard } from '@/components/home/post/post-card';
import { flattenSavedPages, useSavedPosts } from '@/hooks/queries/use-saved-posts';

/** Feed bài viết đã lưu với infinite scroll (Virtuoso). */
export function SavedFeed() {
  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSavedPosts();

  const posts = useMemo(() => flattenSavedPages(data?.pages), [data?.pages]);

  useEffect(() => {
    if (!isError) return;
    toast.error(error?.message ?? 'Không tải được dữ liệu. Thử lại sau.');
  }, [isError, error?.message]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) return <FeedSkeletonList />;

  if (isError) {
    return (
      <p className="text-muted-foreground text-sm" role="alert">
        {error.message}
      </p>
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

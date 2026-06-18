'use client';

import { useEffect, useMemo, useRef } from 'react';

import { FeedSkeletonList } from '@/components/home/feed/feed-skeleton-list';
import { PostCard } from '@/components/home/post/post-card';
import { flattenSavedPages, useSavedPosts } from '@/hooks/queries/use-saved-posts';

/** Feed bài viết đã lưu với infinite scroll. */
export function SavedFeed() {
  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSavedPosts();

  const posts = useMemo(() => flattenSavedPages(data?.pages), [data?.pages]);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void fetchNextPage();
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (isLoading) return <FeedSkeletonList />;

  if (isError) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400" role="alert">
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
    <>
      <ul className="flex flex-col">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} onDismiss={() => {}} hideDismiss />
        ))}
      </ul>
      <div ref={loadMoreRef} className="flex min-h-11 items-center justify-center py-4">
        {isFetchingNextPage ? (
          <p className="text-muted-foreground text-sm" aria-live="polite">
            Đang tải thêm…
          </p>
        ) : null}
      </div>
    </>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FeedSkeletonList } from '@/components/home/feed/feed-skeleton-list';
import { PostCard } from '@/components/home/post/post-card';
import { Button } from '@/components/shared/button';
import { flattenProfileFeedPages, useProfileFeed } from '@/hooks/queries/use-profile-feed';

type Props = {
  username: string;
  isOwner: boolean;
  isDeleted: boolean;
  onCreatePost?: () => void;
};

export function ProfileFeed({ username, isOwner, isDeleted, onCreatePost }: Props) {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProfileFeed(username, !isDeleted);

  const posts = useMemo(() => flattenProfileFeedPages(data?.pages), [data?.pages]);
  const visiblePosts = useMemo(
    () => posts.filter((p) => !dismissedIds.has(p.id)),
    [posts, dismissedIds],
  );

  const dismissPost = useCallback((postId: string) => {
    setDismissedIds((prev) => new Set(prev).add(postId));
  }, []);

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

  if (isDeleted) {
    return (
      <p className="text-muted-foreground px-4 py-12 text-center text-sm">
        Tài khoản này không khả dụng
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="px-4 py-4">
        <FeedSkeletonList />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3 px-4 py-8 text-center">
        <p className="text-muted-foreground text-sm">{error.message}</p>
        <Button variant="secondary" size="md" onClick={() => void refetch()}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (visiblePosts.length === 0) {
    return (
      <div className="space-y-3 px-4 py-12 text-center">
        <p className="text-muted-foreground text-sm">
          {isOwner ? 'Chia sẻ bài viết đầu tiên của bạn' : 'Người này chưa có bài viết.'}
        </p>
        {isOwner && onCreatePost ? (
          <Button variant="primary" size="md" onClick={onCreatePost}>
            Tạo bài viết
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <ul className="border-border flex flex-col border-t px-4">
        {visiblePosts.map((post) => (
          <PostCard key={post.id} post={post} onDismiss={dismissPost} hideDismiss />
        ))}
      </ul>

      <div ref={loadMoreRef} className="flex min-h-11 items-center justify-center py-4">
        {isFetchingNextPage ? (
          <p className="text-muted-foreground text-sm" aria-live="polite">
            Đang tải thêm…
          </p>
        ) : hasNextPage ? null : (
          <p className="text-muted-foreground text-xs">Đã hiển thị tất cả bài viết.</p>
        )}
      </div>
    </>
  );
}

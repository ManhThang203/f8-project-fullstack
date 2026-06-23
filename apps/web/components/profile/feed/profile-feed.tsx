'use client';

import { useCallback, useMemo, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';

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

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
    <div className="border-border border-t px-4">
      <Virtuoso
        useWindowScroll
        data={visiblePosts}
        computeItemKey={(_, post) => post.id}
        endReached={handleEndReached}
        overscan={600}
        itemContent={(_, post) => (
          <PostCard post={post} onDismiss={dismissPost} hideDismiss />
        )}
        components={{
          Footer: () => (
            <div className="flex min-h-11 items-center justify-center py-4">
              {isFetchingNextPage ? (
                <p className="text-muted-foreground text-sm" aria-live="polite">
                  Đang tải thêm…
                </p>
              ) : hasNextPage ? null : (
                <p className="text-muted-foreground text-xs">Đã hiển thị tất cả bài viết.</p>
              )}
            </div>
          ),
        }}
      />
    </div>
  );
}

'use client';

import type { ProfileGridItemDto } from '@threads/shared';
import { useEffect, useRef } from 'react';

import { ProfileMediaTile } from '@/components/profile/profile-media-tile';
import type { ProfileTab } from '@/components/profile/profile-utils';
import { Button } from '@/components/shared/button';
import {
  flattenProfileGridPages,
  useProfileGrid,
} from '@/hooks/queries/use-profile-grid';
import { cn } from '@/lib/utils';

type Props = {
  username: string;
  tab: ProfileTab;
  isOwner: boolean;
  isDeleted: boolean;
  onTileClick: (item: ProfileGridItemDto) => void;
  onCreatePost?: () => void;
};

function emptyCopy(tab: ProfileTab, isOwner: boolean): string {
  if (tab === 'reels') return 'Chưa có Reels.';
  if (tab === 'liked') return 'Chưa có bài viết đã thích.';
  return isOwner ? 'Chia sẻ bài viết đầu tiên của bạn' : 'Người này chưa có bài viết.';
}

export function ProfileMediaGrid({
  username,
  tab,
  isOwner,
  isDeleted,
  onTileClick,
  onCreatePost,
}: Props) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProfileGrid(username, tab, !isDeleted);

  const items = flattenProfileGridPages(data?.pages);

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
      <div className="grid grid-cols-3 gap-px md:gap-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-muted aspect-square animate-pulse" />
        ))}
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

  if (items.length === 0) {
    return (
      <div className="space-y-3 px-4 py-12 text-center">
        <p className="text-muted-foreground text-sm">{emptyCopy(tab, isOwner)}</p>
        {isOwner && tab === 'posts' && onCreatePost ? (
          <Button variant="primary" size="md" onClick={onCreatePost}>
            Tạo bài viết
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className={cn('grid grid-cols-3 gap-px md:gap-1')}>
        {items.map((item) => (
          <ProfileMediaTile
            key={item.postId}
            item={item}
            username={username}
            onClick={() => onTileClick(item)}
          />
        ))}
      </div>
      {isFetchingNextPage ? (
        <div className="flex justify-center py-6">
          <span
            className="border-muted-foreground h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
            aria-label="Đang tải thêm"
          />
        </div>
      ) : null}
      <div ref={loadMoreRef} className="h-1" aria-hidden />
    </>
  );
}

'use client';

import type { ReelsFeedItemDto, ReelsFeedMeta } from '@costy/shared';
import { useInfiniteQuery } from '@tanstack/react-query';

import { apiQuery } from '@/lib/api';
import { queryKeys } from '@/lib/query';

const LIMIT = 10;

/** Lấy feed reels phân trang vô hạn; trang đầu có thể bắt đầu từ startPostId, các trang sau dùng cursor. */
export function useReelsFeed(startPostId?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.posts.reels(startPostId),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: String(LIMIT) });
      if (pageParam) params.set('cursor', pageParam);
      if (startPostId) params.set('startPostId', startPostId);

      return apiQuery<ReelsFeedItemDto[], ReelsFeedMeta>(`/posts/reels?${params}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta?.nextCursor ?? undefined,
  });
}

/** Gộp mảng data từ các trang infinite query thành một danh sách reels phẳng. */
export function flattenReelsFeedPages(
  pages: { data: ReelsFeedItemDto[] }[] | undefined,
): ReelsFeedItemDto[] {
  return pages?.flatMap((p) => p.data) ?? [];
}

'use client';

import type { ReelsFeedItemDto, ReelsFeedMeta } from '@costy/shared';
import { useInfiniteQuery } from '@tanstack/react-query';

import { apiQuery } from '@/lib/api-query';
import { queryKeys } from '@/lib/query-keys';

const LIMIT = 10;

export function useReelsFeed(startPostId?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.posts.reels(startPostId),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: String(LIMIT) });
      if (pageParam) params.set('cursor', pageParam);
      else if (startPostId) params.set('startPostId', startPostId);

      return apiQuery<ReelsFeedItemDto[], ReelsFeedMeta>(`/posts/reels?${params}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta?.nextCursor ?? undefined,
  });
}

export function flattenReelsFeedPages(
  pages: { data: ReelsFeedItemDto[] }[] | undefined,
): ReelsFeedItemDto[] {
  return pages?.flatMap((p) => p.data) ?? [];
}

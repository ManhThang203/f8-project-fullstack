'use client';

import type { PostFeedItemDto, PostFeedMeta } from '@costy/shared';
import { useInfiniteQuery } from '@tanstack/react-query';

import { apiQuery } from '@/lib/api-query';
import { queryKeys } from '@/lib/query-keys';

export function usePostsFeed() {
  return useInfiniteQuery({
    queryKey: queryKeys.posts.feed,
    queryFn: ({ pageParam }) => {
      const qs = pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : '';
      return apiQuery<PostFeedItemDto[], PostFeedMeta>(`/posts${qs}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta?.nextCursor ?? undefined,
  });
}

export function flattenPostsFeedPages(
  pages: { data: PostFeedItemDto[] }[] | undefined,
): PostFeedItemDto[] {
  return pages?.flatMap((p) => p.data) ?? [];
}

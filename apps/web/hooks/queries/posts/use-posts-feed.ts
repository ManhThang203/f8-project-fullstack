'use client';

import type { PostFeedItemDto, PostFeedMeta } from '@costy/shared';
import { useInfiniteQuery } from '@tanstack/react-query';

import { apiQuery } from '@/lib/api';
import { queryKeys } from '@/lib/query';

export type FeedSort = 'recent' | 'top';
export type FeedScope = 'all' | 'following';

export function usePostsFeed(options?: { sort?: FeedSort; scope?: FeedScope }) {
  const sort = options?.sort ?? 'recent';
  const scope = options?.scope ?? 'all';

  return useInfiniteQuery({
    queryKey: [...queryKeys.posts.feed, sort, scope],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ sort, scope });
      if (pageParam) params.set('cursor', pageParam);
      return apiQuery<PostFeedItemDto[], PostFeedMeta>(`/posts?${params}`);
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

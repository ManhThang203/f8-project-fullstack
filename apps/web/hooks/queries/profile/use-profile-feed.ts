'use client';

import type { PostFeedItemDto, PostFeedMeta } from '@costy/shared';
import { useInfiniteQuery } from '@tanstack/react-query';

import { apiQuery } from '@/lib/api';
import { queryKeys } from '@/lib/query';

function profileFeedPath(username: string, cursor?: string) {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  return `/users/${encodeURIComponent(username)}/feed?${params}`;
}

export function useProfileFeed(username: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.users.feed(username),
    queryFn: ({ pageParam }) =>
      apiQuery<PostFeedItemDto[], PostFeedMeta>(profileFeedPath(username, pageParam)),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta?.nextCursor ?? undefined,
    enabled,
  });
}

export function flattenProfileFeedPages(
  pages: { data: PostFeedItemDto[] }[] | undefined,
): PostFeedItemDto[] {
  return pages?.flatMap((p) => p.data) ?? [];
}

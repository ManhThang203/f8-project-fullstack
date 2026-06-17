'use client';

import type { PostFeedItemDto } from '@costy/shared';
import { useInfiniteQuery } from '@tanstack/react-query';

import { apiQuery } from '@/lib/api-query';
import { queryKeys } from '@/lib/query-keys';

type SavedMeta = { nextCursor?: string | null };

/** Danh sách bài viết đã lưu, phân trang cursor. */
export function useSavedPosts() {
  return useInfiniteQuery({
    queryKey: queryKeys.me.saved,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20' });
      if (pageParam) params.set('cursor', pageParam);
      return apiQuery<PostFeedItemDto[], SavedMeta>(`/me/saved?${params}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta?.nextCursor ?? undefined,
  });
}

export function flattenSavedPages(
  pages: { data: PostFeedItemDto[] }[] | undefined,
): PostFeedItemDto[] {
  return pages?.flatMap((p) => p.data) ?? [];
}

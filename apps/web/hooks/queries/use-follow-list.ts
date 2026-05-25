'use client';

import type { UserListMeta, UserSummaryDto } from '@threads/shared';
import { useInfiniteQuery } from '@tanstack/react-query';

import { apiQuery } from '@/lib/api-query';
import { queryKeys } from '@/lib/query-keys';

export function useFollowList(
  username: string,
  mode: 'followers' | 'following',
  searchQuery: string,
) {
  return useInfiniteQuery({
    queryKey: queryKeys.users.followList(username, mode, searchQuery),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set('cursor', pageParam);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      params.set('limit', '20');
      const path = `/users/${encodeURIComponent(username)}/${mode}?${params}`;
      return apiQuery<UserSummaryDto[], UserListMeta>(path);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta?.nextCursor ?? undefined,
  });
}

export function flattenFollowListPages(
  pages: { data: UserSummaryDto[] }[] | undefined,
): UserSummaryDto[] {
  return pages?.flatMap((p) => p.data) ?? [];
}

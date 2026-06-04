'use client';

import type { ProfileGridItemDto, ProfileGridMeta } from '@costy/shared';
import { useInfiniteQuery } from '@tanstack/react-query';

import type { ProfileTab } from '@/components/profile/profile-utils';
import { apiQuery } from '@/lib/api-query';
import { queryKeys } from '@/lib/query-keys';

function profileGridPath(username: string, tab: ProfileTab, cursor?: string) {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', '12');
  if (tab === 'reels') params.set('kind', 'video');
  else if (tab === 'posts') params.set('kind', 'image');

  return tab === 'liked'
    ? `/users/${encodeURIComponent(username)}/likes?${params}`
    : `/users/${encodeURIComponent(username)}/posts?${params}`;
}

export function useProfileGrid(username: string, tab: ProfileTab, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.users.grid(username, tab),
    queryFn: ({ pageParam }) =>
      apiQuery<ProfileGridItemDto[], ProfileGridMeta>(profileGridPath(username, tab, pageParam)),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta?.nextCursor ?? undefined,
    enabled,
  });
}

export function flattenProfileGridPages(
  pages: { data: ProfileGridItemDto[] }[] | undefined,
): ProfileGridItemDto[] {
  return pages?.flatMap((p) => p.data) ?? [];
}

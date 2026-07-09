'use client';

import type { BlockedUserDto } from '@costy/shared';
import { useInfiniteQuery } from '@tanstack/react-query';

import { apiQuery } from '@/lib/api';
import { queryKeys } from '@/lib/query';

type BlockedPage = {
  items: BlockedUserDto[];
  nextCursor: string | null;
};

/** Danh sách user đã chặn, phân trang cursor. */
export function useBlockedUsers() {
  return useInfiniteQuery({
    queryKey: queryKeys.me.blocked,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20' });
      if (pageParam) params.set('cursor', pageParam);
      const res = await apiQuery<BlockedUserDto[], { nextCursor: string | null }>(
        `/blocks?${params.toString()}`,
      );
      return {
        items: res.data,
        nextCursor: res.meta?.nextCursor ?? null,
      } satisfies BlockedPage;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

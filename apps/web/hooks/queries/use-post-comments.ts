import { useInfiniteQuery } from '@tanstack/react-query';
import { apiQuery } from '@/lib/api-query';
import type { CursorPageQuery, PostFeedItemDto } from '@costy/shared';

export function usePostComments(postId: string, order: 'asc' | 'desc' = 'desc', enabled = true) {
  return useInfiniteQuery({
    queryKey: ['posts', 'comments', postId, order],
    queryFn: async ({ pageParam }) => {
      const qs = pageParam ? `?cursor=${pageParam}&limit=20&order=${order}` : `?limit=20&order=${order}`;
      const res = await apiQuery<PostFeedItemDto[], { nextCursor: string | null }>(
        `/posts/${postId}/comments${qs}`
      );
      return {
        items: res.data,
        nextCursor: res.meta?.nextCursor ?? null,
      };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!postId && enabled,
  });
}

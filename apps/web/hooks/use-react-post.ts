import type { PostFeedItemDto } from '@costy/shared';
import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

type FeedPage = { data: PostFeedItemDto[] };
type FeedCache = InfiniteData<FeedPage>;

type ReactPostVariables = {
  postId: string;
  type: string | null;
};

type ReactPostResponse = {
  postId: string;
  reactionType: string | null;
  likeCount: number;
};

export function useReactPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, type }: ReactPostVariables) => {
      const res = await apiFetch<ReactPostResponse>(`/posts/${postId}/reactions`, {
        method: 'PUT',
        body: JSON.stringify({ type }),
      });
      if (!res.success) {
        throw new Error(res.error.message);
      }
      return res.data;
    },
    onMutate: async ({ postId, type }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.feed });
      // Lưu snapshot mọi biến thể feed (recent/top, all/following) để rollback khi lỗi.
      const previous = queryClient.getQueriesData<FeedCache>({ queryKey: queryKeys.posts.feed });

      queryClient.setQueriesData<FeedCache>(
        { queryKey: queryKeys.posts.feed },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((p) => {
                if (p.id === postId) {
                  const wasLiked = p.myReaction !== null;
                  const isLikedNow = type !== null;
                  let newLikeCount = p.likeCount;
                  if (!wasLiked && isLikedNow) newLikeCount++;
                  if (wasLiked && !isLikedNow) newLikeCount = Math.max(0, newLikeCount - 1);

                  return { ...p, myReaction: type, likeCount: newLikeCount };
                }
                return p;
              }),
            })),
          };
        },
      );

      return { previous };
    },
    onError: (err, newTodo, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
    // We do not invalidate queries on settled because the socket will broadcast the exact likeCount anyway
  });
}

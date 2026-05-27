import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

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
      const previousData = queryClient.getQueryData(queryKeys.posts.feed);

      queryClient.setQueryData(queryKeys.posts.feed, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.map((p: any) => {
              if (p.id === postId) {
                // Tính toán likeCount giả định
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
      });

      return { previousData };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.posts.feed, context.previousData);
      }
    },
    // We do not invalidate queries on settled because the socket will broadcast the exact likeCount anyway
  });
}

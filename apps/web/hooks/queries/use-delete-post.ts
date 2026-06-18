import type { PostFeedItemDto } from '@costy/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';
import { decrementReplyCountInFeedCache } from '@/lib/post-cache';
import { queryKeys } from '@/lib/query-keys';

export type DeletePostInput = {
  postId: string;
  rootPostId?: string;
  isTopLevelComment?: boolean;
};

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId }: DeletePostInput) => {
      const res = await apiFetch<unknown>(`/posts/${postId}`, { method: 'DELETE' });
      if (!res.success) {
        throw new Error(res.error?.message || 'Không thể xóa bài viết');
      }
      return res;
    },
    onSuccess: (_data, { postId, rootPostId, isTopLevelComment }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed });
      queryClient.invalidateQueries({ queryKey: ['posts', 'comments'] });

      if (rootPostId) {
        queryClient.invalidateQueries({ queryKey: ['posts', rootPostId] });
      }

      if (rootPostId && isTopLevelComment) {
        decrementReplyCountInFeedCache(queryClient, rootPostId);
      }

      // Loại bỏ post/comment khỏi cache single-post nếu có
      queryClient.removeQueries({ queryKey: ['posts', postId] });
    },
  });
}

/** Helper gọi delete cho comment — truyền rootPostId để cập nhật replyCount. */
export function buildDeleteCommentInput(
  comment: PostFeedItemDto,
  rootPostId: string,
): DeletePostInput {
  return {
    postId: comment.id,
    rootPostId,
    isTopLevelComment: comment.parentId === rootPostId,
  };
}

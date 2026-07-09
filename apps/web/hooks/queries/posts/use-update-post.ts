'use client';

import type { PostFeedItemDto, PostVisibilityDto } from '@costy/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiQueryData } from '@/lib/api';
import { patchReelItemInCache, queryKeys } from '@/lib/query';

export type UpdatePostVars = {
  postId: string;
  content?: string;
  visibility?: PostVisibilityDto;
};

/** Cập nhật nội dung/chế độ riêng tư bài viết và refresh các cache liên quan. */
export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation<PostFeedItemDto, Error, UpdatePostVars>({
    mutationFn: ({ postId, content, visibility }) =>
      apiQueryData<PostFeedItemDto>(`/posts/${encodeURIComponent(postId)}`, {
        method: 'PUT',
        body: JSON.stringify({ content, visibility }),
      }),
    onSuccess: (post) => {
      queryClient.setQueryData(['posts', post.id], post);
      patchReelItemInCache(queryClient, post.id, { content: post.content });
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed });
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

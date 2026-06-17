'use client';

import type { PostFeedItemDto, PostVisibilityDto } from '@costy/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiQueryData } from '@/lib/api-query';
import { queryKeys } from '@/lib/query-keys';

// #region agent log
fetch('http://127.0.0.1:7600/ingest/7e460ad4-e57b-4c68-a427-7775819b3418', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '3d36f0' },
  body: JSON.stringify({
    sessionId: '3d36f0',
    runId: 'initial',
    hypothesisId: 'B',
    location: 'apps/web/hooks/queries/use-update-post.ts:1',
    message: 'use-update-post module resolved',
    data: { module: 'use-update-post' },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

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
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed });
      void queryClient.invalidateQueries({ queryKey: ['posts', 'reels'] });
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

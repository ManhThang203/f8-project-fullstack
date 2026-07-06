import type { PostFeedItemDto } from '@costy/shared';
import { useQuery } from '@tanstack/react-query';

import { apiQuery } from '@/lib/api-query';

export function usePost(postId: string | null) {
  return useQuery({
    queryKey: ['posts', postId],
    queryFn: async () => {
      const res = await apiQuery<PostFeedItemDto>(`/posts/${postId}`);
      return res.data;
    },
    enabled: !!postId,
  });
}

/** Lấy chuỗi tổ tiên (cấp 1 → chính nó) của 1 comment/reply để ghim + cuộn tới khi deep-link sâu nhiều cấp. */
export function usePostAncestry(commentId: string | null) {
  return useQuery({
    queryKey: ['posts', commentId, 'ancestry'],
    queryFn: async () => {
      const res = await apiQuery<PostFeedItemDto[]>(`/posts/${commentId}/ancestry`);
      return res.data;
    },
    enabled: !!commentId,
  });
}

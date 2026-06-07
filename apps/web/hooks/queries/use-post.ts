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

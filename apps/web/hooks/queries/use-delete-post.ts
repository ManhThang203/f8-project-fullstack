import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await apiFetch(`/posts/${postId}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Không thể xóa bài viết');
      }
      return res.json();
    },
    onSuccess: (_, postId) => {
      // Refresh feed
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed });
      // Invalidate comments as well if this was a comment
      queryClient.invalidateQueries({ queryKey: ['posts', 'comments'] });
    },
  });
}

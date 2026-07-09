'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiQueryData } from '@/lib/api';
import { queryKeys, removeReelItemsByAuthorInCache } from '@/lib/query';

/** Chặn hoặc bỏ chặn user và invalidate cache liên quan. */
export function useBlockMutation() {
  const queryClient = useQueryClient();

  return useMutation<{ ok: true }, Error, { userId: string; block: boolean }>({
    mutationFn: ({ userId, block }) =>
      apiQueryData<{ ok: true }>(`/blocks/${encodeURIComponent(userId)}`, {
        method: block ? 'POST' : 'DELETE',
      }),
    onSuccess: (_data, { userId, block }) => {
      if (block) removeReelItemsByAuthorInCache(queryClient, userId);
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.blocked });
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed });
      void queryClient.invalidateQueries({ queryKey: ['friends'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations });
    },
  });
}

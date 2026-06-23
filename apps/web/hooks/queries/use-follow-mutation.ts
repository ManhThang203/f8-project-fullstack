'use client';

import type { FollowStateDto } from '@costy/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiQueryData } from '@/lib/api-query';

type FollowVars = {
  userId: string;
  follow: boolean;
};

/** Invalidate danh sách followers/following và search; profile do profile-view patch optimistic. */
function invalidateFollowRelatedQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['users', 'followers'] });
  void queryClient.invalidateQueries({ queryKey: ['users', 'following'] });
  void queryClient.invalidateQueries({ queryKey: ['users', 'search'] });
}

export function useFollowMutation(options?: {
  onSuccess?: (data: FollowStateDto, variables: FollowVars) => void;
  onError?: (error: Error, variables: FollowVars) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, follow }: FollowVars) =>
      apiQueryData<FollowStateDto>(`/users/${userId}/follow`, {
        method: follow ? 'POST' : 'DELETE',
      }),
    onSuccess: (data, variables) => {
      invalidateFollowRelatedQueries(queryClient);
      options?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options?.onError?.(error, variables);
    },
  });
}

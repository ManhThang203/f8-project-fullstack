'use client';

import type { FollowStateDto } from '@threads/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiQueryData } from '@/lib/api-query';

type FollowVars = {
  userId: string;
  follow: boolean;
};

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
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      options?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options?.onError?.(error, variables);
    },
  });
}

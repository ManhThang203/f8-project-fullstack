'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AppealDto, RestrictedPostDto } from '@costy/shared';

import { apiQueryData } from '@/lib/api-query';
import { queryKeys } from '@/lib/query-keys';

export function useRestrictedPosts() {
  return useQuery({
    queryKey: queryKeys.me.restrictedPosts(),
    queryFn: () => apiQueryData<RestrictedPostDto[]>('/me/restricted-posts'),
  });
}

export function useSubmitAppealMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, message }: { postId: string; message: string }) => {
      return apiQueryData<AppealDto>(`/me/posts/${postId}/appeal`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.me.restrictedPosts() });
    },
  });
}

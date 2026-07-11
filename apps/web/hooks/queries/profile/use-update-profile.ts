'use client';

import type { ProfileDto, UpdateMyProfileBody } from '@costy/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiQueryData } from '@/lib/api';
import { queryKeys } from '@/lib/query';

/** Cập nhật tên/tiểu sử của chính mình và refresh cache profile (envelope apiQuery). */
export function useUpdateMyProfile(username: string) {
  const queryClient = useQueryClient();

  return useMutation<ProfileDto, Error, UpdateMyProfileBody>({
    mutationFn: (body) =>
      apiQueryData<ProfileDto>('/me/profile', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (profile) => {
      const envelope = { data: profile };
      queryClient.setQueryData(queryKeys.users.profile(username), envelope);
      if (profile.username !== username) {
        queryClient.setQueryData(queryKeys.users.profile(profile.username), envelope);
      }
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

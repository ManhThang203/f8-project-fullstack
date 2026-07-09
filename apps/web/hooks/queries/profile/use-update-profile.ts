'use client';

import type { ProfileDto, UpdateMyProfileBody } from '@costy/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiQueryData } from '@/lib/api';
import { queryKeys } from '@/lib/query';

/** Cập nhật tên/tiểu sử của chính mình và refresh cache profile tương ứng. */
export function useUpdateMyProfile(username: string) {
  const queryClient = useQueryClient();

  return useMutation<ProfileDto, Error, UpdateMyProfileBody>({
    mutationFn: (body) =>
      apiQueryData<ProfileDto>('/me/profile', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.users.profile(username), profile);
      if (profile.username !== username) {
        queryClient.setQueryData(queryKeys.users.profile(profile.username), profile);
      }
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

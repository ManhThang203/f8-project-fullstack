'use client';

import type { ProfileDto, UpdateMyProfileBody } from '@costy/shared';
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
    hypothesisId: 'D',
    location: 'apps/web/hooks/queries/use-update-profile.ts:1',
    message: 'use-update-profile module resolved',
    data: { module: 'use-update-profile' },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

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

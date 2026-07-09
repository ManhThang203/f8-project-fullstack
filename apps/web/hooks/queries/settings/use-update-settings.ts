'use client';

import type { ApiSuccess, UpdateUserSettingsBody, UserSettingsDto } from '@costy/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiQueryData } from '@/lib/api';
import { queryKeys } from '@/lib/query';

/** Cập nhật cài đặt quyền riêng tư / thông báo và refresh cache. */
export function useUpdateMySettings() {
  const queryClient = useQueryClient();

  return useMutation<UserSettingsDto, Error, UpdateUserSettingsBody>({
    mutationFn: (body) =>
      apiQueryData<UserSettingsDto>('/me/settings', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData<ApiSuccess<UserSettingsDto>>(queryKeys.me.settings, (old) => ({
        ...(old ?? { success: true }),
        data,
      }));
    },
  });
}

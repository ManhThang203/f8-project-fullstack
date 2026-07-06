'use client';

import type { UserSettingsDto } from '@costy/shared';
import { useQuery } from '@tanstack/react-query';

import { apiQuery } from '@/lib/api-query';
import { queryKeys } from '@/lib/query-keys';

/** Lấy cài đặt quyền riêng tư và thông báo của user hiện tại. */
export function useMySettings() {
  return useQuery({
    queryKey: queryKeys.me.settings,
    queryFn: () => apiQuery<UserSettingsDto>('/me/settings'),
    select: (res) => res.data,
  });
}

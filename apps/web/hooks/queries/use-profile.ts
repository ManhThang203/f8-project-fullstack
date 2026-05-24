'use client';

import type { ProfileDto } from '@threads/shared';
import { useQuery } from '@tanstack/react-query';

import { apiQuery } from '@/lib/api-query';
import { queryKeys } from '@/lib/query-keys';

export function useProfile(username: string) {
  return useQuery({
    queryKey: queryKeys.users.profile(username),
    queryFn: () => apiQuery<ProfileDto>(`/users/${encodeURIComponent(username)}`),
    select: (res) => res.data,
  });
}

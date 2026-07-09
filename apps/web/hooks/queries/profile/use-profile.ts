'use client';

import type { ProfileDto } from '@costy/shared';
import { useQuery } from '@tanstack/react-query';

import { apiQuery } from '@/lib/api';
import { queryKeys } from '@/lib/query';

export function useProfile(username: string) {
  return useQuery({
    queryKey: queryKeys.users.profile(username),
    queryFn: () => apiQuery<ProfileDto>(`/users/${encodeURIComponent(username)}`),
    select: (res) => res.data,
  });
}

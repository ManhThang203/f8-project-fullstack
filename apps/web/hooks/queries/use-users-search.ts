'use client';

import { useQuery } from '@tanstack/react-query';

import { apiQueryData } from '@/lib/api-query';
import { queryKeys } from '@/lib/query-keys';

type UserSearchRow = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
};

/** Stable fallback — avoid `data ?? []` inline (new array every render). */
export const EMPTY_USER_SEARCH: UserSearchRow[] = [];

export function useUsersSearch(
  q: string,
  options?: { enabled?: boolean; excludeUserId?: string | null },
) {
  const trimmed = q.trim();
  const enabled = options?.enabled ?? true;
  const excludeUserId = options?.excludeUserId;

  return useQuery({
    queryKey: queryKeys.users.search(trimmed),
    queryFn: () => {
      const qs = trimmed ? `?q=${encodeURIComponent(trimmed)}` : '';
      return apiQueryData<UserSearchRow[]>(`/users${qs}`);
    },
    enabled,
    select: (data) =>
      excludeUserId ? data.filter((u) => u.id !== excludeUserId) : data,
  });
}

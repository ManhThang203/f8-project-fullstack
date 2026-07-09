'use client';

import type {
  HashtagSearchResultDto,
  PostFeedItemDto,
  UserSearchResultDto,
} from '@costy/shared';
import { useQuery } from '@tanstack/react-query';

import { apiQueryData } from '@/lib/api';
import { queryKeys } from '@/lib/query';

/** Tìm bài viết qua hybrid search API. */
export function useSearchPosts(q: string, enabled = true) {
  const trimmed = q.trim();
  return useQuery({
    queryKey: queryKeys.search.posts(trimmed),
    queryFn: () =>
      apiQueryData<PostFeedItemDto[]>(
        `/search?q=${encodeURIComponent(trimmed)}&limit=20`,
      ),
    enabled: enabled && trimmed.length >= 2,
  });
}

/** Tìm người dùng qua /search/users. */
export function useSearchUsers(q: string, enabled = true) {
  const trimmed = q.trim();
  return useQuery({
    queryKey: queryKeys.search.users(trimmed),
    queryFn: () =>
      apiQueryData<UserSearchResultDto[]>(
        `/search/users?q=${encodeURIComponent(trimmed)}&limit=20`,
      ),
    enabled: enabled && trimmed.length >= 2,
  });
}

/** Tìm hashtag qua /search/hashtags. */
export function useSearchHashtags(q: string, enabled = true) {
  const trimmed = q.trim();
  return useQuery({
    queryKey: queryKeys.search.hashtags(trimmed),
    queryFn: () =>
      apiQueryData<HashtagSearchResultDto[]>(
        `/search/hashtags?q=${encodeURIComponent(trimmed)}&limit=20`,
      ),
    enabled: enabled && trimmed.length >= 2,
  });
}

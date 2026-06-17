'use client';

import type { FriendStateDto, FriendUserDto } from '@costy/shared';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiQuery, apiQueryData } from '@/lib/api-query';
import { queryKeys } from '@/lib/query-keys';

export type FriendAction = 'request' | 'cancel' | 'accept' | 'reject' | 'unfriend';

type FriendVars = {
  userId: string;
  action: FriendAction;
};

type FriendListMeta = {
  nextCursor: string | null;
};

const FRIEND_ACTION_REQUEST: Record<FriendAction, { method: 'POST' | 'DELETE'; suffix: string }> = {
  request: { method: 'POST', suffix: '/request' },
  cancel: { method: 'DELETE', suffix: '/request' },
  accept: { method: 'POST', suffix: '/accept' },
  reject: { method: 'POST', suffix: '/reject' },
  unfriend: { method: 'DELETE', suffix: '' },
};

/** Gọi API kết bạn/hủy/chấp nhận/từ chối và refresh profile + danh sách bạn bè. */
export function useFriendMutation(options?: {
  onSuccess?: (data: FriendStateDto, variables: FriendVars) => void;
  onError?: (error: Error, variables: FriendVars) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation<FriendStateDto, Error, FriendVars>({
    mutationFn: ({ userId, action }) => {
      const request = FRIEND_ACTION_REQUEST[action];
      return apiQueryData<FriendStateDto>(
        `/friends/${encodeURIComponent(userId)}${request.suffix}`,
        { method: request.method },
      );
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['friends'] });
      options?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options?.onError?.(error, variables);
    },
  });
}

/** Lấy danh sách bạn bè của viewer, có hỗ trợ tìm kiếm và phân trang cursor. */
export function useFriendsList(q: string) {
  const search = q.trim();

  return useInfiniteQuery({
    queryKey: queryKeys.friends.list(search),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20' });
      if (search) params.set('q', search);
      if (pageParam) params.set('cursor', pageParam);
      return apiQuery<FriendUserDto[], FriendListMeta>(`/friends?${params}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta?.nextCursor ?? undefined,
  });
}

/** Lấy danh sách lời mời kết bạn đến hoặc đã gửi. */
export function useFriendRequests(type: 'incoming' | 'outgoing') {
  return useInfiniteQuery({
    queryKey: queryKeys.friends.requests(type),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ type, limit: '20' });
      if (pageParam) params.set('cursor', pageParam);
      return apiQuery<FriendUserDto[], FriendListMeta>(`/friends/requests?${params}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta?.nextCursor ?? undefined,
  });
}

/** Gom các page kết quả bạn bè thành một mảng phẳng để render. */
export function flattenFriendPages(
  pages: { data: FriendUserDto[] }[] | undefined,
): FriendUserDto[] {
  return pages?.flatMap((page) => page.data) ?? [];
}

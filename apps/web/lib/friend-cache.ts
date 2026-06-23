import type { FriendStateDto, FriendUserDto, ProfileDto } from '@costy/shared';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type { FriendAction } from '@/hooks/queries/use-friend-mutation';

type FriendListPage = {
  data: FriendUserDto[];
  meta?: { nextCursor: string | null };
};

type FriendInfiniteCache = InfiniteData<FriendListPage, string | undefined>;

type ProfileCache = { data: ProfileDto };

type FriendMutationVars = {
  userId: string;
  action: FriendAction;
  user?: FriendUserDto;
};

/** Xóa user khỏi các infinite query friends khớp prefix query key. */
function removeUserFromFriendInfiniteQueries(
  queryClient: QueryClient,
  userId: string,
  queryKeyPrefix: readonly unknown[],
): void {
  queryClient.setQueriesData<FriendInfiniteCache>({ queryKey: [...queryKeyPrefix] }, (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        data: page.data.filter((user) => user.id !== userId),
      })),
    };
  });
}

/** Cập nhật friendStatus (và số bạn bè nếu cần) trên profile cache đã load. */
function patchProfileFriendState(
  queryClient: QueryClient,
  userId: string,
  status: FriendStateDto['status'],
  friendsCountDelta = 0,
): void {
  queryClient.setQueriesData<ProfileCache>({ queryKey: ['users', 'profile'] }, (old) => {
    if (!old?.data || old.data.id !== userId) return old;
    return {
      ...old,
      data: {
        ...old.data,
        friendStatus: status,
        counts: {
          ...old.data.counts,
          friends: Math.max(0, old.data.counts.friends + friendsCountDelta),
        },
      },
    };
  });
}

/** Thêm user lên đầu page đầu của danh sách bạn bè trong cache (sau accept). */
function prependUserToFriendsListCaches(queryClient: QueryClient, user: FriendUserDto): void {
  queryClient.setQueriesData<FriendInfiniteCache>({ queryKey: ['friends', 'list'] }, (old) => {
    if (!old?.pages.length) return old;

    const firstPage = old.pages[0];
    if (!firstPage) return old;

    const exists = old.pages.some((page) => page.data.some((item) => item.id === user.id));
    if (exists) {
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          data: page.data.map((item) =>
            item.id === user.id ? { ...item, friendStatus: user.friendStatus } : item,
          ),
        })),
      };
    }

    return {
      ...old,
      pages: [{ ...firstPage, data: [user, ...firstPage.data] }, ...old.pages.slice(1)],
    };
  });
}

/** Thêm user lên đầu page đầu của lời mời đã gửi trong cache (sau gửi lời mời). */
function prependUserToOutgoingCaches(queryClient: QueryClient, user: FriendUserDto): void {
  queryClient.setQueriesData<FriendInfiniteCache>(
    { queryKey: ['friends', 'requests', 'outgoing'] },
    (old) => {
      if (!old?.pages.length) return old;

      const firstPage = old.pages[0];
      if (!firstPage) return old;

      const exists = old.pages.some((page) => page.data.some((item) => item.id === user.id));
      if (exists) return old;

      return {
        ...old,
        pages: [{ ...firstPage, data: [user, ...firstPage.data] }, ...old.pages.slice(1)],
      };
    },
  );
}

/** Patch cache danh sách bạn bè / profile sau mutation thành công, tránh refetch hàng loạt. */
export function applyFriendMutationCacheUpdates(
  queryClient: QueryClient,
  variables: FriendMutationVars,
  data: FriendStateDto,
): void {
  const { userId, action, user } = variables;

  switch (action) {
    case 'unfriend':
      removeUserFromFriendInfiniteQueries(queryClient, userId, ['friends', 'list']);
      patchProfileFriendState(queryClient, userId, data.status, -1);
      break;
    case 'accept':
      removeUserFromFriendInfiniteQueries(queryClient, userId, ['friends', 'requests', 'incoming']);
      if (user) {
        prependUserToFriendsListCaches(queryClient, { ...user, friendStatus: data.status });
      }
      patchProfileFriendState(queryClient, userId, data.status, 1);
      break;
    case 'reject':
      removeUserFromFriendInfiniteQueries(queryClient, userId, ['friends', 'requests', 'incoming']);
      patchProfileFriendState(queryClient, userId, data.status);
      break;
    case 'cancel':
      removeUserFromFriendInfiniteQueries(queryClient, userId, ['friends', 'requests', 'outgoing']);
      patchProfileFriendState(queryClient, userId, data.status);
      break;
    case 'request':
      patchProfileFriendState(queryClient, userId, data.status);
      if (user) {
        prependUserToOutgoingCaches(queryClient, { ...user, friendStatus: data.status });
      }
      break;
  }
}

import type { NotificationDto, ProfileDto, UserSearchResultDto, UserSummaryDto } from '@costy/shared';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it } from 'vitest';

import { queryKeys } from './query-keys';
import { patchMyUserAppearanceInCaches } from './user-appearance-cache';

import type { Conversation } from '@/types/chat';

function makeProfile(id: string): ProfileDto {
  return {
    id,
    username: 'alice',
    name: 'Old',
    bio: null,
    image: 'https://cdn.example/old.jpg',
    coverImage: null,
    createdAt: new Date().toISOString(),
    deletedAt: null,
    counts: { posts: 0, followers: 0, following: 0, friends: 0 },
    isOwner: true,
    isFollowing: false,
    friendStatus: 'self',
  };
}

describe('user-appearance-cache', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
  });

  it('patchMyUserAppearanceInCaches cập nhật profile, follow list, search, notif, chat peers', () => {
    const userId = 'u1';
    queryClient.setQueryData(queryKeys.users.profile('alice'), { data: makeProfile(userId) });
    queryClient.setQueryData(queryKeys.users.followList('bob', 'followers', ''), {
      pages: [
        {
          data: [
            { id: userId, username: 'alice', name: 'Old', image: 'old.jpg', isFollowing: false },
            { id: 'u2', username: 'other', name: 'X', image: null, isFollowing: true },
          ] satisfies UserSummaryDto[],
          meta: { nextCursor: null },
        },
      ],
      pageParams: [undefined],
    });
    queryClient.setQueryData(queryKeys.search.users('al'), [
      { id: userId, username: 'alice', name: 'Old', image: 'old.jpg', isFollowing: false },
    ] satisfies UserSearchResultDto[]);
    queryClient.setQueryData(queryKeys.notifications.all(), {
      pages: [
        {
          items: [
            {
              id: 'n1',
              recipientId: 'u2',
              actorId: userId,
              type: 'USER_FOLLOWED',
              entityType: null,
              entityId: null,
              readAt: null,
              createdAt: new Date().toISOString(),
              actor: { id: userId, name: 'Old', username: 'alice', image: 'old.jpg' },
            },
          ] satisfies NotificationDto[],
        },
      ],
      pageParams: [undefined],
    });
    queryClient.setQueryData(queryKeys.chat.conversations, [
      {
        id: 'c1',
        isGroup: false,
        name: null,
        peers: [
          { id: userId, username: 'alice', name: 'Old', image: 'old.jpg' },
          { id: 'u2', username: 'bob', name: 'Bob', image: null },
        ],
        lastMessage: null,
        unreadCount: 0,
        updatedAt: new Date().toISOString(),
      },
    ] satisfies Conversation[]);

    patchMyUserAppearanceInCaches(queryClient, userId, {
      image: 'https://cdn.example/new.jpg',
      name: 'Alice',
    });

    expect(queryClient.getQueryData<{ data: ProfileDto }>(queryKeys.users.profile('alice'))?.data).toMatchObject({
      image: 'https://cdn.example/new.jpg',
      name: 'Alice',
    });

    const follow = queryClient.getQueryData<{ pages: { data: UserSummaryDto[] }[] }>(
      queryKeys.users.followList('bob', 'followers', ''),
    );
    expect(follow?.pages[0]?.data[0]).toMatchObject({
      id: userId,
      image: 'https://cdn.example/new.jpg',
      name: 'Alice',
    });
    expect(follow?.pages[0]?.data[1]).toMatchObject({ id: 'u2', image: null });

    expect(queryClient.getQueryData<UserSearchResultDto[]>(queryKeys.search.users('al'))?.[0]).toMatchObject({
      image: 'https://cdn.example/new.jpg',
      name: 'Alice',
    });

    const notifs = queryClient.getQueryData<{ pages: { items: NotificationDto[] }[] }>(
      queryKeys.notifications.all(),
    );
    expect(notifs?.pages[0]?.items[0]?.actor).toMatchObject({
      image: 'https://cdn.example/new.jpg',
      name: 'Alice',
    });

    const convs = queryClient.getQueryData<Conversation[]>(queryKeys.chat.conversations);
    expect(convs?.[0]?.peers[0]).toMatchObject({
      image: 'https://cdn.example/new.jpg',
      name: 'Alice',
    });
    expect(convs?.[0]?.peers[1]).toMatchObject({ id: 'u2', image: null });
  });
});

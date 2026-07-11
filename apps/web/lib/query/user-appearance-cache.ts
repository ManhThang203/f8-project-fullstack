import type {
  FriendUserDto,
  NotificationDto,
  ProfileDto,
  UserSearchResultDto,
  UserSummaryDto,
} from '@costy/shared';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import { patchAuthorProfileInCaches } from './post-cache';
import { queryKeys } from './query-keys';
import { patchReelAuthorProfileInCache } from './reels-cache';

import type { Conversation } from '@/types/chat';

export type UserAppearancePatch = {
  image?: string | null;
  name?: string | null;
  username?: string;
};

type ProfileEnvelope = { data: ProfileDto };

type AppearingUser = { id: string; image?: string | null; name?: string | null; username?: string };

type UserSummaryListInfinite = InfiniteData<{ data: UserSummaryDto[] }, unknown>;
type FriendListInfinite = InfiniteData<{ data: FriendUserDto[] }, unknown>;

type NotificationInfinite = InfiniteData<{ items: NotificationDto[] }, unknown>;

type BlockedInfinite = InfiniteData<{ items: AppearingUser[] }, unknown>;

/** Có field appearance cần patch không (cho phép image: null). */
function hasAppearancePatch(patch: UserAppearancePatch): boolean {
  return 'image' in patch || patch.name !== undefined || patch.username !== undefined;
}

/** Áp appearance lên object user/peer/actor nếu cùng id. */
function applyAppearance<T extends AppearingUser>(
  user: T,
  userId: string,
  patch: UserAppearancePatch,
): T {
  if (user.id !== userId) return user;
  return { ...user, ...patch };
}

/** Patch appearance trong từng page của infinite list user (giữ nguyên generic T). */
function patchUserListInfinite<T extends AppearingUser>(
  old: InfiniteData<{ data: T[] }, unknown> | undefined,
  userId: string,
  patch: UserAppearancePatch,
): InfiniteData<{ data: T[] }, unknown> | undefined {
  if (!old?.pages) return old;
  let changed = false;
  const pages = old.pages.map((page) => {
    if (!page || !('data' in page) || !Array.isArray(page.data)) return page;
    let pageChanged = false;
    const data = page.data.map((user) => {
      const next = applyAppearance(user, userId, patch);
      if (next !== user) pageChanged = true;
      return next;
    });
    if (pageChanged) changed = true;
    return pageChanged ? { ...page, data } : page;
  });
  return changed ? { ...old, pages } : old;
}

/** Cập nhật image/name/username của chính mình trên mọi cache UI liên quan. */
export function patchMyUserAppearanceInCaches(
  queryClient: QueryClient,
  userId: string,
  patch: UserAppearancePatch,
): void {
  if (!hasAppearancePatch(patch)) return;

  patchAuthorProfileInCaches(queryClient, userId, patch);
  patchReelAuthorProfileInCache(queryClient, userId, patch);

  queryClient.setQueriesData<ProfileEnvelope>({ queryKey: ['users', 'profile'] }, (old) => {
    if (!old?.data || old.data.id !== userId) return old;
    return { ...old, data: { ...old.data, ...patch } };
  });

  const summaryListPrefixes = [
    ['users', 'followers'],
    ['users', 'following'],
  ] as const;

  for (const queryKey of summaryListPrefixes) {
    queryClient.setQueriesData<UserSummaryListInfinite>({ queryKey: [...queryKey] }, (old) =>
      patchUserListInfinite(old, userId, patch),
    );
  }

  const friendListPrefixes = [
    ['friends', 'list'],
    ['friends', 'requests'],
  ] as const;

  for (const queryKey of friendListPrefixes) {
    queryClient.setQueriesData<FriendListInfinite>({ queryKey: [...queryKey] }, (old) =>
      patchUserListInfinite(old, userId, patch),
    );
  }

  queryClient.setQueriesData<UserSearchResultDto[]>({ queryKey: ['search', 'users'] }, (old) => {
    if (!Array.isArray(old)) return old;
    let changed = false;
    const next = old.map((user) => {
      const patched = applyAppearance(user, userId, patch);
      if (patched !== user) changed = true;
      return patched;
    });
    return changed ? next : old;
  });

  queryClient.setQueriesData<BlockedInfinite>({ queryKey: queryKeys.me.blocked }, (old) => {
    if (!old?.pages) return old;
    let changed = false;
    const pages = old.pages.map((page) => {
      let pageChanged = false;
      const items = page.items.map((user) => {
        const next = applyAppearance(user, userId, patch);
        if (next !== user) pageChanged = true;
        return next;
      });
      if (pageChanged) changed = true;
      return pageChanged ? { ...page, items } : page;
    });
    return changed ? { ...old, pages } : old;
  });

  queryClient.setQueriesData<NotificationInfinite>(
    { queryKey: queryKeys.notifications.all() },
    (old) => {
      if (!old?.pages) return old;
      let changed = false;
      const pages = old.pages.map((page) => ({
        ...page,
        items: page.items.map((notif) => {
          if (!notif.actor || notif.actor.id !== userId) return notif;
          changed = true;
          return { ...notif, actor: { ...notif.actor, ...patch } };
        }),
      }));
      return changed ? { ...old, pages } : old;
    },
  );

  queryClient.setQueryData<Conversation[]>(queryKeys.chat.conversations, (prev) => {
    if (!prev?.length) return prev;
    let changed = false;
    const next = prev.map((conv) => {
      let peersChanged = false;
      const peers = conv.peers.map((peer) => {
        const patched = applyAppearance(peer, userId, patch);
        if (patched !== peer) peersChanged = true;
        return patched;
      });
      if (!peersChanged) return conv;
      changed = true;
      return { ...conv, peers };
    });
    return changed ? next : prev;
  });
}

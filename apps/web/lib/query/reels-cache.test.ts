import type { ReelsFeedItemDto } from '@costy/shared';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  patchReelFollowStateByAuthorInCache,
  patchReelItemInCache,
  removeReelItemsByAuthorInCache,
} from './reels-cache';

function makeReel(id: string, authorId: string): ReelsFeedItemDto {
  return {
    id,
    content: `reel ${id}`,
    createdAt: new Date().toISOString(),
    author: { id: authorId, username: `user-${authorId}`, name: null, image: null },
    replyCount: 0,
    commentCount: 0,
    likeCount: 0,
    shareCount: 0,
    myReaction: null,
    savedByMe: false,
    topReactions: [],
    isFollowing: false,
    video: {
      id: `media-${id}`,
      type: 'video',
      url: `https://cdn.test/${id}.mp4`,
      width: null,
      height: null,
      durationMs: null,
      position: 0,
    },
  };
}

const REELS_KEY = ['posts', 'reels', ''] as const;

function seedReelsCache(queryClient: QueryClient, pages: ReelsFeedItemDto[][]) {
  queryClient.setQueryData(REELS_KEY, {
    pages: pages.map((data) => ({ data, meta: { nextCursor: null } })),
    pageParams: pages.map((_, i) => (i === 0 ? undefined : `cursor-${i}`)),
  });
}

type ReelsCache = {
  pages: { data: ReelsFeedItemDto[] }[];
};

describe('reels-cache', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
  });

  it('patchReelItemInCache chỉ cập nhật đúng reel theo id, qua nhiều page', () => {
    seedReelsCache(queryClient, [
      [makeReel('r1', 'a1'), makeReel('r2', 'a2')],
      [makeReel('r3', 'a3')],
    ]);

    patchReelItemInCache(queryClient, 'r3', { savedByMe: true, shareCount: 7 });

    const cache = queryClient.getQueryData<ReelsCache>(REELS_KEY);
    expect(cache?.pages[1]?.data[0]).toMatchObject({ id: 'r3', savedByMe: true, shareCount: 7 });
    expect(cache?.pages[0]?.data[0]).toMatchObject({ id: 'r1', savedByMe: false, shareCount: 0 });
    expect(cache?.pages[0]?.data[1]).toMatchObject({ id: 'r2', savedByMe: false });
  });

  it('patchReelItemInCache giữ nguyên cache khi không có reel khớp id', () => {
    seedReelsCache(queryClient, [[makeReel('r1', 'a1')]]);
    const before = queryClient.getQueryData<ReelsCache>(REELS_KEY);

    patchReelItemInCache(queryClient, 'khong-ton-tai', { savedByMe: true });

    expect(queryClient.getQueryData<ReelsCache>(REELS_KEY)).toBe(before);
  });

  it('removeReelItemsByAuthorInCache gỡ mọi reel của tác giả bị block', () => {
    seedReelsCache(queryClient, [
      [makeReel('r1', 'blocked'), makeReel('r2', 'a2')],
      [makeReel('r3', 'blocked'), makeReel('r4', 'a4')],
    ]);

    removeReelItemsByAuthorInCache(queryClient, 'blocked');

    const cache = queryClient.getQueryData<ReelsCache>(REELS_KEY);
    expect(cache?.pages[0]?.data.map((r) => r.id)).toEqual(['r2']);
    expect(cache?.pages[1]?.data.map((r) => r.id)).toEqual(['r4']);
  });

  it('patchReelFollowStateByAuthorInCache cập nhật isFollowing cho mọi reel cùng tác giả', () => {
    seedReelsCache(queryClient, [
      [makeReel('r1', 'a1'), makeReel('r2', 'a2')],
      [makeReel('r3', 'a1')],
    ]);

    patchReelFollowStateByAuthorInCache(queryClient, 'a1', true);

    const cache = queryClient.getQueryData<ReelsCache>(REELS_KEY);
    expect(cache?.pages[0]?.data[0]).toMatchObject({ id: 'r1', isFollowing: true });
    expect(cache?.pages[1]?.data[0]).toMatchObject({ id: 'r3', isFollowing: true });
    expect(cache?.pages[0]?.data[1]).toMatchObject({ id: 'r2', isFollowing: false });
  });

  it('patchReelFollowStateByAuthorInCache xử lý unfollow (false)', () => {
    seedReelsCache(queryClient, [
      [{ ...makeReel('r1', 'a1'), isFollowing: true }, { ...makeReel('r2', 'a1'), isFollowing: true }],
    ]);

    patchReelFollowStateByAuthorInCache(queryClient, 'a1', false);

    const cache = queryClient.getQueryData<ReelsCache>(REELS_KEY);
    expect(cache?.pages[0]?.data[0]).toMatchObject({ id: 'r1', isFollowing: false });
    expect(cache?.pages[0]?.data[1]).toMatchObject({ id: 'r2', isFollowing: false });
  });
});

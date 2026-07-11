import type { PostFeedItemDto } from '@costy/shared';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it } from 'vitest';

import { patchAuthorProfileInCaches, patchFeedItemInCache, patchPostItemInRelatedCaches } from './post-cache';
import { queryKeys } from './query-keys';

function makePost(id: string, authorId = 'a1'): PostFeedItemDto {
  return {
    id,
    parentId: null,
    content: `post ${id}`,
    createdAt: new Date().toISOString(),
    visibility: 'PUBLIC',
    author: { id: authorId, username: `user-${authorId}`, name: null, image: null },
    replyCount: 0,
    commentCount: 0,
    likeCount: 0,
    shareCount: 0,
    myReaction: null,
    savedByMe: false,
    topReactions: [],
    media: [],
  };
}

const FEED_KEY = [...queryKeys.posts.feed, 'recent', 'all'] as const;

function seedFeedCache(queryClient: QueryClient, pages: PostFeedItemDto[][]) {
  queryClient.setQueryData(FEED_KEY, {
    pages: pages.map((data) => ({ data, meta: { nextCursor: null } })),
    pageParams: pages.map((_, i) => (i === 0 ? undefined : `cursor-${i}`)),
  });
}

type FeedCache = {
  pages: { data: PostFeedItemDto[] }[];
};

describe('post-cache', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
  });

  it('patchFeedItemInCache chỉ cập nhật đúng post theo id, qua nhiều page', () => {
    seedFeedCache(queryClient, [
      [makePost('p1'), makePost('p2')],
      [makePost('p3')],
    ]);

    patchFeedItemInCache(queryClient, 'p3', { savedByMe: true, shareCount: 7 });

    const cache = queryClient.getQueryData<FeedCache>(FEED_KEY);
    expect(cache?.pages[1]?.data[0]).toMatchObject({ id: 'p3', savedByMe: true, shareCount: 7 });
    expect(cache?.pages[0]?.data[0]).toMatchObject({ id: 'p1', savedByMe: false, shareCount: 0 });
    expect(cache?.pages[0]?.data[1]).toMatchObject({ id: 'p2', savedByMe: false });
  });

  it('patchFeedItemInCache giữ nguyên cache khi không có post khớp id', () => {
    seedFeedCache(queryClient, [[makePost('p1')]]);
    const before = queryClient.getQueryData<FeedCache>(FEED_KEY);

    patchFeedItemInCache(queryClient, 'khong-ton-tai', { savedByMe: true });

    expect(queryClient.getQueryData<FeedCache>(FEED_KEY)).toBe(before);
  });

  it('patchPostItemInRelatedCaches cập nhật profile feed, search, post detail', () => {
    const profileKey = queryKeys.users.feed('alice');
    const searchKey = queryKeys.search.posts('hello');
    const detailKey = ['posts', 'p2'] as const;

    queryClient.setQueryData(profileKey, {
      pages: [{ data: [makePost('p1'), makePost('p2')], meta: { nextCursor: null } }],
      pageParams: [undefined],
    });
    queryClient.setQueryData(searchKey, [makePost('p2'), makePost('p3')]);
    queryClient.setQueryData(detailKey, makePost('p2'));

    patchPostItemInRelatedCaches(queryClient, 'p2', { savedByMe: true, shareCount: 9 });

    const profile = queryClient.getQueryData<FeedCache>(profileKey);
    expect(profile?.pages[0]?.data[1]).toMatchObject({ id: 'p2', savedByMe: true, shareCount: 9 });
    expect(profile?.pages[0]?.data[0]).toMatchObject({ id: 'p1', savedByMe: false });

    const search = queryClient.getQueryData<PostFeedItemDto[]>(searchKey);
    expect(search?.[0]).toMatchObject({ id: 'p2', savedByMe: true, shareCount: 9 });
    expect(search?.[1]).toMatchObject({ id: 'p3', savedByMe: false });

    expect(queryClient.getQueryData<PostFeedItemDto>(detailKey)).toMatchObject({
      id: 'p2',
      savedByMe: true,
      shareCount: 9,
    });
  });

  it('patchAuthorProfileInCaches cập nhật avatar author trên feed, comment và detail', () => {
    const commentsKey = ['posts', 'comments', 'p1'] as const;
    const detailKey = ['posts', 'p2'] as const;

    seedFeedCache(queryClient, [[makePost('p1', 'a1'), makePost('p2', 'a2')]]);
    queryClient.setQueryData(commentsKey, {
      pages: [{ items: [makePost('c1', 'a1'), makePost('c2', 'a2')], nextCursor: null }],
      pageParams: [undefined],
    });
    queryClient.setQueryData(detailKey, makePost('p2', 'a1'));

    patchAuthorProfileInCaches(queryClient, 'a1', {
      image: 'https://cdn.example/new-avatar.jpg',
      name: 'Alice',
    });

    const feed = queryClient.getQueryData<FeedCache>(FEED_KEY);
    expect(feed?.pages[0]?.data[0]?.author).toMatchObject({
      id: 'a1',
      image: 'https://cdn.example/new-avatar.jpg',
      name: 'Alice',
    });
    expect(feed?.pages[0]?.data[1]?.author).toMatchObject({ id: 'a2', image: null, name: null });

    const comments = queryClient.getQueryData<{ pages: { items: PostFeedItemDto[] }[] }>(commentsKey);
    expect(comments?.pages[0]?.items[0]?.author).toMatchObject({
      image: 'https://cdn.example/new-avatar.jpg',
      name: 'Alice',
    });
    expect(comments?.pages[0]?.items[1]?.author).toMatchObject({ id: 'a2', image: null });

    expect(queryClient.getQueryData<PostFeedItemDto>(detailKey)?.author).toMatchObject({
      id: 'a1',
      image: 'https://cdn.example/new-avatar.jpg',
      name: 'Alice',
    });
  });
});

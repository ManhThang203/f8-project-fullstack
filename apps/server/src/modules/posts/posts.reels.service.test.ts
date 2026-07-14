import { reelsFeedQuerySchema } from '@costy/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { encodeCursor } from '../../lib/pagination/cursor.js';

type FakePost = {
  id: string;
  createdAt: Date;
  content: string;
  author: { id: string; username: string; name: string; image: string | null };
  media: unknown[];
  _count: { replies: number; likes: number; shares: number };
};

const prismaMock = {
  post: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  follow: { findMany: vi.fn() },
  postLike: { findMany: vi.fn() },
  postSave: { findMany: vi.fn() },
};

vi.mock('@costy/db', () => ({
  prisma: prismaMock,
  Prisma: {},
  MediaKind: { VIDEO: 'VIDEO' },
  MediaStatus: { READY: 'READY' },
}));

vi.mock('../../lib/blocks/block-utils.js', () => ({
  getBlockedRelatedUserIds: vi.fn(),
}));

vi.mock('./posts.access.js', () => ({
  getTopReactionsMap: vi.fn(async () => new Map()),
}));

vi.mock('./posts-count.js', () => ({
  getCommentCountMap: vi.fn(async () => new Map()),
}));

vi.mock('./posts.mapper.js', () => ({
  postReelInclude: {},
  mapPostToReelsFeedItemDto: (post: FakePost | null) => {
    if (!post) return null;
    return {
      id: post.id,
      content: post.content,
      createdAt: post.createdAt.toISOString(),
      author: post.author,
      replyCount: 0,
      commentCount: 0,
      likeCount: 0,
      shareCount: 0,
      myReaction: null,
      savedByMe: false,
      topReactions: [],
      isFollowing: false,
      video: {
        id: `media-${post.id}`,
        url: 'https://example.com/v.mp4',
        kind: 'VIDEO',
        status: 'READY',
        width: 1080,
        height: 1920,
        durationMs: 1000,
        thumbnailUrl: null,
        sortOrder: 0,
      },
    };
  },
}));

vi.mock('./posts.utils.js', async (importOriginal) => {
  const mod = (await importOriginal()) as Record<string, unknown>;
  return {
    ...mod,
    /** Giữ thứ tự deterministic trong test (không xáo). */
    shuffle: <T>(arr: T[]) => arr,
  };
});

const { getBlockedRelatedUserIds } = (await import(
  '../../lib/blocks/block-utils.js'
)) as unknown as { getBlockedRelatedUserIds: ReturnType<typeof vi.fn> };

const { listReelsFeed } = await import('./posts.reels.service.js');

/** Tạo N bài giả, p0 mới nhất → p(N-1) cũ nhất. */
function makePosts(n: number): FakePost[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    createdAt: new Date(1_000_000_000_000 - i * 1000),
    content: '',
    author: { id: 'author', username: 'u', name: 'User', image: null },
    media: [{ kind: 'VIDEO' }],
    _count: { replies: 0, likes: 0, shares: 0 },
  }));
}

/** Lọc in-memory theo where AND (exclude id + cursor) mà listReelsFeed gửi. */
function filterByWhere(posts: FakePost[], where: { AND?: unknown[] }): FakePost[] {
  const clauses = where.AND ?? [];
  return posts.filter((post) => {
    for (const raw of clauses) {
      const c = raw as {
        id?: { not?: string };
        OR?: Array<{
          createdAt?: { lt?: Date };
          AND?: Array<{ createdAt?: { equals?: Date }; id?: { lt?: string } }>;
        }>;
      };
      if (c.id?.not && post.id === c.id.not) return false;
      if (c.OR) {
        const ok = c.OR.some((cond) => {
          if (cond.createdAt?.lt) return post.createdAt < cond.createdAt.lt;
          if (cond.AND) {
            let equals: Date | undefined;
            let idLt: string | undefined;
            for (const part of cond.AND) {
              if (part.createdAt?.equals) equals = part.createdAt.equals;
              if (part.id?.lt) idLt = part.id.lt;
            }
            return (
              equals !== undefined &&
              idLt !== undefined &&
              post.createdAt.getTime() === equals.getTime() &&
              post.id < idLt
            );
          }
          return false;
        });
        if (!ok) return false;
      }
    }
    return true;
  });
}

/** Wire findMany/findFirst theo danh sách posts cố định. */
function stubFeedFromPosts(allPosts: FakePost[]) {
  prismaMock.post.findFirst.mockImplementation(async ({ where }: { where: { id?: string } }) => {
    const id = where.id;
    return allPosts.find((p) => p.id === id) ?? null;
  });

  prismaMock.post.findMany.mockImplementation(
    async ({ where, take }: { where: { AND?: unknown[] }; take: number }) => {
      const filtered = filterByWhere(allPosts, where);
      return filtered.slice(0, take);
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getBlockedRelatedUserIds.mockResolvedValue([]);
  prismaMock.follow.findMany.mockResolvedValue([]);
  prismaMock.postLike.findMany.mockResolvedValue([]);
  prismaMock.postSave.findMany.mockResolvedValue([]);
});

describe('reelsFeedQuerySchema', () => {
  it('reject startPostId khi limit < 2', () => {
    const parsed = reelsFeedQuerySchema.safeParse({ limit: 1, startPostId: 'p0' });
    expect(parsed.success).toBe(false);
  });

  it('accept startPostId khi limit >= 2', () => {
    const parsed = reelsFeedQuerySchema.safeParse({ limit: 2, startPostId: 'p0' });
    expect(parsed.success).toBe(true);
  });
});

describe('listReelsFeed', () => {
  it('phân trang N=25 limit=10 trả đủ unique và hết cursor', async () => {
    const posts = makePosts(25);
    stubFeedFromPosts(posts);

    const allIds: string[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 5; page++) {
      const result = await listReelsFeed({ limit: 10, cursor }, null);
      allIds.push(...result.items.map((i) => i.id));
      if (!result.nextCursor) {
        expect(page).toBe(2);
        break;
      }
      cursor = result.nextCursor;
    }

    expect(new Set(allIds).size).toBe(25);
    expect(allIds).toHaveLength(25);
  });

  it('trang 1 với startPostId: pin đầu và findMany exclude id đó', async () => {
    const posts = makePosts(25);
    stubFeedFromPosts(posts);

    const result = await listReelsFeed({ limit: 10, startPostId: 'p20' }, null);

    expect(result.items[0]?.id).toBe('p20');
    expect(result.items).toHaveLength(10);
    expect(prismaMock.post.findFirst).toHaveBeenCalled();

    const findManyArg = prismaMock.post.findMany.mock.calls[0]![0] as {
      where: { AND: unknown[] };
      take: number;
    };
    expect(findManyArg.take).toBe(10); // restLimit 9 + 1
    expect(JSON.stringify(findManyArg.where)).toContain('"not":"p20"');
    expect(result.items.slice(1).some((i) => i.id === 'p20')).toBe(false);
  });

  it('trang 2+ với startPostId+cursor: không pin, vẫn exclude, không trả lại pin', async () => {
    const posts = makePosts(25);
    stubFeedFromPosts(posts);

    const page1 = await listReelsFeed({ limit: 10, startPostId: 'p20' }, null);
    expect(page1.nextCursor).toBeTruthy();

    prismaMock.post.findFirst.mockClear();

    const page2 = await listReelsFeed(
      { limit: 10, cursor: page1.nextCursor!, startPostId: 'p20' },
      null,
    );

    expect(prismaMock.post.findFirst).not.toHaveBeenCalled();
    expect(page2.items.every((i) => i.id !== 'p20')).toBe(true);
    expect(page2.items[0]?.id).not.toBe('p20');

    const findManyArg = prismaMock.post.findMany.mock.calls[0]![0] as {
      where: { AND: unknown[] };
    };
    expect(JSON.stringify(findManyArg.where)).toContain('"not":"p20"');
  });

  it('cuộn hết với startPostId không trùng pin trong toàn bộ items', async () => {
    const posts = makePosts(25);
    stubFeedFromPosts(posts);

    const allIds: string[] = [];
    let cursor: string | undefined;
    const startPostId = 'p20';

    for (let i = 0; i < 5; i++) {
      const result = await listReelsFeed({ limit: 10, cursor, startPostId }, null);
      allIds.push(...result.items.map((item) => item.id));
      if (!result.nextCursor) break;
      cursor = result.nextCursor;
    }

    expect(allIds[0]).toBe('p20');
    expect(allIds.filter((id) => id === 'p20')).toHaveLength(1);
    expect(new Set(allIds).size).toBe(25);
  });

  it('nextCursor encode từ tail deterministic (không +1ms)', async () => {
    const posts = makePosts(15);
    stubFeedFromPosts(posts);

    const result = await listReelsFeed({ limit: 10 }, null);
    expect(result.nextCursor).toBe(encodeCursor(posts[9]!.createdAt, posts[9]!.id));
  });
});

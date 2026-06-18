import { MediaKind, MediaStatus, prisma, type Prisma } from '@costy/db';
import type {
  CursorPageQuery,
  FeedQuery,
  PostFeedItemDto,
  ReelsFeedItemDto,
  ReelsFeedQuery,
} from '@costy/shared';

import { AppError } from '../../lib/errors.js';

import {
  buildVisibilityCondition,
  canViewPost,
  getTopReactionsMap,
  getViewerFriendIds,
  getViewerSavedSet,
} from './posts.access.js';
import {
  mapPostToFeedItemDto,
  mapPostToReelsFeedItemDto,
  postFeedInclude,
  postReelInclude,
} from './posts.mapper.js';
import { decodeCursor, encodeCursor, shuffle } from './posts.utils.js';

/** Điều kiện giới hạn feed về bài của bạn bè / người đang follow / chính mình (scope=following). */
async function buildScopeCondition(
  viewerId: string,
  friendIds: string[],
): Promise<Prisma.PostWhereInput> {
  const follows = await prisma.follow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
  });
  const authorIds = [...new Set([viewerId, ...friendIds, ...follows.map((f) => f.followingId)])];
  return { authorId: { in: authorIds } };
}

// Lấy danh sách bài viết + phân trang khi cuộn xuống
export async function listFeed(
  query: FeedQuery,
  viewerId?: string | null,
): Promise<{
  items: PostFeedItemDto[];
  nextCursor: string | null;
}> {
  const friendIds = await getViewerFriendIds(viewerId ?? null);

  const conditions: Prisma.PostWhereInput[] = [
    { deletedAt: null, hiddenAt: null, parentId: null },
    buildVisibilityCondition(viewerId ?? null, friendIds),
  ];
  if (query.scope === 'following' && viewerId) {
    conditions.push(await buildScopeCondition(viewerId, friendIds));
  }

  const page = await fetchFeedPage(query, { AND: conditions });
  const { rows, nextCursor } = page;

  let viewerReactionMap = new Map<string, string>();
  if (viewerId && rows.length > 0) {
    const likes = await prisma.postLike.findMany({
      where: { userId: viewerId, postId: { in: rows.map((p) => p.id) } },
      select: { postId: true, type: true },
    });
    viewerReactionMap = new Map(likes.map((l) => [l.postId, l.type]));
  }

  const savedSet = await getViewerSavedSet(
    viewerId ?? null,
    rows.map((p) => p.id),
  );

  const topReactionsMap = await getTopReactionsMap(rows.map((p) => p.id));

  const items = rows.map((p) =>
    mapPostToFeedItemDto(
      p,
      viewerReactionMap.get(p.id) ?? null,
      savedSet.has(p.id),
      topReactionsMap.get(p.id) ?? [],
    ),
  );

  return { items, nextCursor };
}

/** Danh sách bài viết của một tác giả, lọc visibility, phân trang cursor. */
export async function listAuthorFeed(
  authorId: string,
  allowedVisibilities: Array<'PUBLIC' | 'FRIENDS' | 'PRIVATE'>,
  query: CursorPageQuery,
  viewerId: string | null,
): Promise<{ items: PostFeedItemDto[]; nextCursor: string | null }> {
  const baseWhere: Prisma.PostWhereInput = {
    authorId,
    deletedAt: null,
    hiddenAt: null,
    parentId: null,
    visibility: { in: allowedVisibilities },
  };

  const cursorData = query.cursor ? decodeCursor(query.cursor) : null;
  const cursorCondition: Prisma.PostWhereInput | null = cursorData
    ? {
        OR: [
          { createdAt: { lt: cursorData.createdAt } },
          { AND: [{ createdAt: { equals: cursorData.createdAt } }, { id: { lt: cursorData.id } }] },
        ],
      }
    : null;

  const take = query.limit + 1;
  const rows = await fetchFeedRows({
    where: cursorCondition ? { AND: [baseWhere, cursorCondition] } : baseWhere,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const tail = page[page.length - 1];
  const nextCursor = hasMore && tail ? encodeCursor(tail.createdAt, tail.id) : null;

  let viewerReactionMap = new Map<string, string>();
  if (viewerId && page.length > 0) {
    const likes = await prisma.postLike.findMany({
      where: { userId: viewerId, postId: { in: page.map((p) => p.id) } },
      select: { postId: true, type: true },
    });
    viewerReactionMap = new Map(likes.map((l) => [l.postId, l.type]));
  }

  const savedSet = await getViewerSavedSet(
    viewerId ?? null,
    page.map((p) => p.id),
  );

  const topReactionsMap = await getTopReactionsMap(page.map((p) => p.id));

  const items = page.map((p) =>
    mapPostToFeedItemDto(
      p,
      viewerReactionMap.get(p.id) ?? null,
      savedSet.has(p.id),
      topReactionsMap.get(p.id) ?? [],
    ),
  );

  return { items, nextCursor };
}

type FeedRow = Awaited<ReturnType<typeof fetchFeedRows>>[number];

function fetchFeedRows(args: Prisma.PostFindManyArgs) {
  return prisma.post.findMany({ ...args, include: postFeedInclude });
}

/**
 * Lấy 1 trang feed theo sort:
 * - recent: cursor (createdAt + id), mới nhất trước.
 * - top: sắp theo tương tác (like + comment), phân trang bằng offset trong cursor.
 */
async function fetchFeedPage(
  query: FeedQuery,
  where: Prisma.PostWhereInput,
): Promise<{ rows: FeedRow[]; nextCursor: string | null }> {
  const take = query.limit + 1;

  if (query.sort === 'top') {
    const offset = query.cursor ? Math.max(0, parseInt(query.cursor, 10) || 0) : 0;
    const rows = await fetchFeedRows({
      where,
      orderBy: [
        { likes: { _count: 'desc' } },
        { replies: { _count: 'desc' } },
        { createdAt: 'desc' },
      ],
      skip: offset,
      take,
    });
    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    return { rows: page, nextCursor: hasMore ? String(offset + query.limit) : null };
  }

  const cursorData = query.cursor ? decodeCursor(query.cursor) : null;
  const cursorCondition: Prisma.PostWhereInput | null = cursorData
    ? {
        OR: [
          { createdAt: { lt: cursorData.createdAt } },
          { AND: [{ createdAt: { equals: cursorData.createdAt } }, { id: { lt: cursorData.id } }] },
        ],
      }
    : null;
  const rows = await fetchFeedRows({
    where: cursorCondition ? { AND: [where, cursorCondition] } : where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
  });
  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const tail = page[page.length - 1];
  const nextCursor = hasMore && tail ? encodeCursor(tail.createdAt, tail.id) : null;
  return { rows: page, nextCursor };
}

// Lấy feed reels ngẫu nhiên
export async function listReelsFeed(
  query: ReelsFeedQuery,
  viewerId: string | null,
): Promise<{ items: ReelsFeedItemDto[]; nextCursor: string | null }> {
  const limit = query.limit;
  // Fetch a larger pool to shuffle from; use offset cursor to page through pool
  const POOL = Math.min(limit * 5, 100);

  const cursorData = query.cursor ? decodeCursor(query.cursor) : null;
  const startPostId = !cursorData ? query.startPostId : undefined;

  const where = cursorData
    ? {
        deletedAt: null,
        hiddenAt: null,
        parentId: null,
        media: { some: { kind: MediaKind.VIDEO, status: MediaStatus.READY } },
        OR: [
          { createdAt: { lt: cursorData.createdAt } },
          { AND: [{ createdAt: { equals: cursorData.createdAt } }, { id: { lt: cursorData.id } }] },
        ],
      }
    : {
        deletedAt: null,
        hiddenAt: null,
        parentId: null,
        media: { some: { kind: MediaKind.VIDEO, status: MediaStatus.READY } },
      };

  const rows = await prisma.post.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: POOL,
    include: postReelInclude,
  });

  const hasMore = rows.length === POOL;
  const pool = hasMore ? rows.slice(0, POOL) : rows;

  shuffle(pool);
  let page = pool.slice(0, limit);

  let pinnedRow: (typeof rows)[number] | null = null;
  if (startPostId) {
    pinnedRow = await prisma.post.findFirst({
      where: {
        id: startPostId,
        deletedAt: null,
        hiddenAt: null,
        parentId: null,
        media: { some: { kind: MediaKind.VIDEO, status: MediaStatus.READY } },
      },
      include: postReelInclude,
    });

    if (!pinnedRow || !mapPostToReelsFeedItemDto(pinnedRow, false)) {
      throw AppError.notFound('Reel not found');
    }

    page = page.filter((p) => p.id !== startPostId);
    page = [pinnedRow, ...page].slice(0, limit);
  }

  // Batch-check isFollowing for all unique authors
  const authorIds = [...new Set(page.map((p) => p.author.id))];
  let followingSet = new Set<string>();
  let reactionMap = new Map<string, string>();
  let savedSet = new Set<string>();
  if (viewerId && page.length > 0) {
    const postIds = page.map((p) => p.id);
    const [follows, likes, saves] = await Promise.all([
      authorIds.length > 0
        ? prisma.follow.findMany({
            where: { followerId: viewerId, followingId: { in: authorIds } },
            select: { followingId: true },
          })
        : Promise.resolve([]),
      prisma.postLike.findMany({
        where: { userId: viewerId, postId: { in: postIds } },
        select: { postId: true, type: true },
      }),
      prisma.postSave.findMany({
        where: { userId: viewerId, postId: { in: postIds } },
        select: { postId: true },
      }),
    ]);
    followingSet = new Set(follows.map((f) => f.followingId));
    reactionMap = new Map(likes.map((l) => [l.postId, l.type]));
    savedSet = new Set(saves.map((s) => s.postId));
  }

  const topReactionsMap = await getTopReactionsMap(page.map((p) => p.id));

  const items: ReelsFeedItemDto[] = [];
  for (const p of page) {
    const dto = mapPostToReelsFeedItemDto(
      p,
      followingSet.has(p.author.id),
      reactionMap.get(p.id) ?? null,
      savedSet.has(p.id),
      topReactionsMap.get(p.id) ?? [],
    );
    if (dto) items.push(dto);
  }

  // Cursor points to the last item in the deterministic order (before shuffle)
  // so next page fetches older posts
  const tail = page[page.length - 1];
  const nextCursor = hasMore && tail ? encodeCursor(tail.createdAt, tail.id) : null;

  return { items, nextCursor };
}

export async function getPostById(
  postId: string,
  viewerId?: string | null,
): Promise<PostFeedItemDto> {
  const row = await prisma.post.findUnique({
    where: { id: postId, deletedAt: null },
    include: postFeedInclude,
  });

  if (!row) {
    throw AppError.notFound('Bài viết không tồn tại hoặc đã bị xóa');
  }

  const allowed = await canViewPost(viewerId ?? null, row);
  if (!allowed) {
    throw AppError.notFound('Bài viết không tồn tại hoặc đã bị xóa');
  }

  let myReaction: string | null = null;
  let savedByMe = false;
  if (viewerId) {
    const [like, save] = await Promise.all([
      prisma.postLike.findUnique({
        where: { userId_postId: { userId: viewerId, postId } },
        select: { type: true },
      }),
      prisma.postSave.findUnique({
        where: { userId_postId: { userId: viewerId, postId } },
        select: { postId: true },
      }),
    ]);
    if (like) myReaction = like.type;
    savedByMe = Boolean(save);
  }

  const topReactionsMap = await getTopReactionsMap([postId]);
  return mapPostToFeedItemDto(
    row,
    myReaction,
    savedByMe,
    topReactionsMap.get(postId) ?? [],
  );
}

export async function getRootPostId(postId: string): Promise<string> {
  let currentId = postId;
  let limit = 10;

  while (limit > 0) {
    const post = await prisma.post.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });

    if (!post) throw AppError.notFound('Bài viết không tồn tại');

    if (!post.parentId) {
      return currentId;
    }
    currentId = post.parentId;
    limit--;
  }

  return currentId;
}

// Lấy danh sách bình luận của 1 bài viết
export async function listComments(
  postId: string,
  query: CursorPageQuery & { order?: 'asc' | 'desc' },
  viewerId?: string | null,
): Promise<{
  items: PostFeedItemDto[];
  nextCursor: string | null;
}> {
  const parent = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true, visibility: true, deletedAt: true },
  });
  if (!parent || parent.deletedAt) {
    throw AppError.notFound('Bài viết không tồn tại hoặc đã bị xóa');
  }
  const allowed = await canViewPost(viewerId ?? null, parent);
  if (!allowed) {
    throw AppError.notFound('Bài viết không tồn tại hoặc đã bị xóa');
  }

  const take = query.limit + 1;
  const cursorData = query.cursor ? decodeCursor(query.cursor) : null;
  const isDesc = query.order !== 'asc'; // default desc
  const op = isDesc ? 'lt' : 'gt';

  const where = cursorData
    ? {
        deletedAt: null,
        hiddenAt: null,
        parentId: postId,
        OR: [
          { createdAt: { [op]: cursorData.createdAt } },
          {
            AND: [{ createdAt: { equals: cursorData.createdAt } }, { id: { [op]: cursorData.id } }],
          },
        ],
      }
    : {
        deletedAt: null,
        hiddenAt: null,
        parentId: postId,
      };

  const rows = await prisma.post.findMany({
    where,
    orderBy: [{ createdAt: isDesc ? 'desc' : 'asc' }, { id: isDesc ? 'desc' : 'asc' }],
    take,
    include: postFeedInclude,
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;

  let viewerReactionMap = new Map<string, string>();
  if (viewerId && page.length > 0) {
    const likes = await prisma.postLike.findMany({
      where: { userId: viewerId, postId: { in: page.map((p) => p.id) } },
      select: { postId: true, type: true },
    });
    viewerReactionMap = new Map(likes.map((l) => [l.postId, l.type]));
  }

  const savedSet = await getViewerSavedSet(
    viewerId ?? null,
    page.map((p) => p.id),
  );

  const topReactionsMap = await getTopReactionsMap(page.map((p) => p.id));

  const items = page.map((p) =>
    mapPostToFeedItemDto(
      p,
      viewerReactionMap.get(p.id) ?? null,
      savedSet.has(p.id),
      topReactionsMap.get(p.id) ?? [],
    ),
  );

  const tail = page[page.length - 1];
  const nextCursor = hasMore && tail ? encodeCursor(tail.createdAt, tail.id) : null;

  return { items, nextCursor };
}

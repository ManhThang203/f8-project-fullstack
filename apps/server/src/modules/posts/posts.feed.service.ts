import { prisma, type Prisma } from '@costy/db';
import type { CursorPageQuery, FeedQuery, PostFeedItemDto } from '@costy/shared';

import { AppError } from '../../lib/errors.js';
import { blockedUsersWhere, getBlockedRelatedUserIds } from '../../lib/blocks/block-utils.js';

import { getCommentCountForRoot, getCommentCountMap } from './posts-count.js';
import {
  buildVisibilityCondition,
  canViewPost,
  getTopReactionsMap,
  getViewerFriendIds,
  getViewerSavedSet,
} from './posts.access.js';
import { mapPostToFeedItemDto, postFeedInclude } from './posts.mapper.js';
import { decodeCursor, encodeCursor } from './posts.utils.js';

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
  const blockedIds = viewerId ? await getBlockedRelatedUserIds(viewerId) : [];

  const conditions: Prisma.PostWhereInput[] = [
    { deletedAt: null, hiddenAt: null, parentId: null },
    buildVisibilityCondition(viewerId ?? null, friendIds),
  ];
  if (blockedIds.length > 0) {
    conditions.push(blockedUsersWhere(blockedIds, 'authorId'));
  }
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
  const commentCountMap = await getCommentCountMap(rows.map((p) => p.id));

  const items = rows.map((p) =>
    mapPostToFeedItemDto(
      p,
      viewerReactionMap.get(p.id) ?? null,
      savedSet.has(p.id),
      topReactionsMap.get(p.id) ?? [],
      commentCountMap.get(p.id),
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
  const commentCountMap = await getCommentCountMap(page.map((p) => p.id));

  const items = page.map((p) =>
    mapPostToFeedItemDto(
      p,
      viewerReactionMap.get(p.id) ?? null,
      savedSet.has(p.id),
      topReactionsMap.get(p.id) ?? [],
      commentCountMap.get(p.id),
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
  // Tính commentCount cho post đơn lẻ (chỉ có ý nghĩa nếu là root)
  let singleCommentCount: number | undefined;
  if (!row.parentId) {
    singleCommentCount = await getCommentCountForRoot(postId);
  }
  return mapPostToFeedItemDto(
    row,
    myReaction,
    savedByMe,
    topReactionsMap.get(postId) ?? [],
    singleCommentCount,
  );
}

export {
  getCommentAncestryChain,
  getRootPostId,
  listComments,
} from './posts.comments.service.js';
export { listReelsFeed } from './posts.reels.service.js';

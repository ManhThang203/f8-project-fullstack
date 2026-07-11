import { MediaKind, MediaStatus, prisma, type Prisma } from '@costy/db';
import type { ReelsFeedItemDto, ReelsFeedQuery } from '@costy/shared';

import { getBlockedRelatedUserIds } from '../../lib/blocks/block-utils.js';
import { AppError } from '../../lib/errors.js';

import { getCommentCountMap } from './posts-count.js';
import { getTopReactionsMap } from './posts.access.js';
import { mapPostToReelsFeedItemDto, postReelInclude } from './posts.mapper.js';
import { decodeCursor, encodeCursor, shuffle } from './posts.utils.js';

/** Lấy feed reels video, phân trang cursor và ẩn bài từ user đã block. */
export async function listReelsFeed(
  query: ReelsFeedQuery,
  viewerId: string | null,
): Promise<{ items: ReelsFeedItemDto[]; nextCursor: string | null }> {
  const limit = query.limit;
  const blockedIds = viewerId ? await getBlockedRelatedUserIds(viewerId) : [];
  const blockedAuthorFilter: Prisma.PostWhereInput =
    blockedIds.length > 0 ? { authorId: { notIn: blockedIds } } : {};
  // Fetch a larger pool to shuffle from; use offset cursor to page through pool
  const POOL = Math.min(limit * 5, 100);

  const cursorData = query.cursor ? decodeCursor(query.cursor) : null;
  const startPostId = !cursorData ? query.startPostId : undefined;

  const where = cursorData
    ? {
        deletedAt: null,
        hiddenAt: null,
        parentId: null,
        ...blockedAuthorFilter,
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
        ...blockedAuthorFilter,
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
        ...blockedAuthorFilter,
        media: { some: { kind: MediaKind.VIDEO, status: MediaStatus.READY } },
      },
      include: postReelInclude,
    });

    if (!pinnedRow || !mapPostToReelsFeedItemDto(pinnedRow, false)) {
      throw AppError.notFound('Không tìm thấy reel');
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
  const commentCountMap = await getCommentCountMap(page.map((p) => p.id));

  const items: ReelsFeedItemDto[] = [];
  for (const p of page) {
    const dto = mapPostToReelsFeedItemDto(
      p,
      followingSet.has(p.author.id),
      reactionMap.get(p.id) ?? null,
      savedSet.has(p.id),
      topReactionsMap.get(p.id) ?? [],
      commentCountMap.get(p.id),
    );
    if (dto) items.push(dto);
  }

  // Cursor points to the last item in the deterministic order (before shuffle)
  // so next page fetches older posts
  const tail = page[page.length - 1];
  const nextCursor = hasMore && tail ? encodeCursor(tail.createdAt, tail.id) : null;

  return { items, nextCursor };
}

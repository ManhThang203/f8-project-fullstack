import { MediaKind, MediaStatus, prisma, type Prisma } from '@costy/db';
import type { ReelsFeedItemDto, ReelsFeedQuery } from '@costy/shared';

import { getBlockedRelatedUserIds } from '../../lib/blocks/block-utils.js';
import { AppError } from '../../lib/errors.js';

import { getCommentCountMap } from './posts-count.js';
import { getTopReactionsMap } from './posts.access.js';
import { mapPostToReelsFeedItemDto, postReelInclude } from './posts.mapper.js';
import { decodeCursor, encodeCursor, shuffle } from './posts.utils.js';

type ReelRow = Prisma.PostGetPayload<{ include: typeof postReelInclude }>;

/** Lấy feed reels video, phân trang cursor và ẩn bài từ user đã block. */
export async function listReelsFeed(
  query: ReelsFeedQuery,
  viewerId: string | null,
): Promise<{ items: ReelsFeedItemDto[]; nextCursor: string | null }> {
  const limit = query.limit;
  const blockedIds = viewerId ? await getBlockedRelatedUserIds(viewerId) : [];
  const blockedAuthorFilter: Prisma.PostWhereInput =
    blockedIds.length > 0 ? { authorId: { notIn: blockedIds } } : {};

  const cursorData = query.cursor ? decodeCursor(query.cursor) : null;
  // Luôn exclude khi có startPostId (kể cả trang cursor) để không trùng video đã pin.
  const excludePostId = query.startPostId;
  const shouldPin = Boolean(excludePostId) && !cursorData;

  const baseWhere: Prisma.PostWhereInput = {
    deletedAt: null,
    hiddenAt: null,
    parentId: null,
    ...blockedAuthorFilter,
    media: { some: { kind: MediaKind.VIDEO, status: MediaStatus.READY } },
  };

  let pinnedRow: ReelRow | null = null;
  if (shouldPin && excludePostId) {
    pinnedRow = await prisma.post.findFirst({
      where: { ...baseWhere, id: excludePostId },
      include: postReelInclude,
    });

    if (!pinnedRow || !mapPostToReelsFeedItemDto(pinnedRow, false)) {
      throw AppError.notFound('Không tìm thấy reel');
    }
  }

  // Trang có pin: lấy limit-1 slot cho phần còn lại; không pin: lấy đủ limit.
  const restLimit = pinnedRow ? Math.max(limit - 1, 0) : limit;
  const cursorCondition: Prisma.PostWhereInput | null = cursorData
    ? {
        OR: [
          { createdAt: { lt: cursorData.createdAt } },
          { AND: [{ createdAt: { equals: cursorData.createdAt } }, { id: { lt: cursorData.id } }] },
        ],
      }
    : null;

  const feedWhere: Prisma.PostWhereInput = {
    AND: [
      baseWhere,
      ...(excludePostId ? [{ id: { not: excludePostId } }] : []),
      ...(cursorCondition ? [cursorCondition] : []),
    ],
  };

  const rows = await prisma.post.findMany({
    where: feedWhere,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: restLimit + 1,
    include: postReelInclude,
  });

  const hasMore = rows.length > restLimit;
  const chronoRest = hasMore ? rows.slice(0, restLimit) : rows;
  const tail = chronoRest[chronoRest.length - 1];
  const nextCursor = hasMore && tail ? encodeCursor(tail.createdAt, tail.id) : null;

  // Giữ pin đầu trang; chỉ shuffle phần còn lại.
  const rest = [...chronoRest];
  shuffle(rest);
  const page: ReelRow[] = pinnedRow ? [pinnedRow, ...rest] : rest;

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

  return { items, nextCursor };
}

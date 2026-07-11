import { prisma } from '@costy/db';
import type { CursorPageQuery, PostFeedItemDto } from '@costy/shared';

import { blockedUsersWhere, getBlockedRelatedUserIds } from '../../lib/blocks/block-utils.js';
import { AppError } from '../../lib/errors.js';

import { getCommentCountMap } from './posts-count.js';
import { canViewPost, getTopReactionsMap, getViewerSavedSet } from './posts.access.js';
import { mapPostToFeedItemDto, postFeedInclude } from './posts.mapper.js';
import { decodeCursor, encodeCursor } from './posts.utils.js';

/** Trả về id bài gốc (root) của một comment/reply bằng cách lần theo parentId. */
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

/**
 * Lấy chuỗi tổ tiên (không gồm bài gốc) từ cấp 1 tới đúng comment/reply được deep-link,
 * dùng để ghim từng cấp cha vào danh sách hiển thị trước khi cuộn tới, kể cả khi reply nằm sâu nhiều cấp.
 */
export async function getCommentAncestryChain(
  commentId: string,
  viewerId?: string | null,
): Promise<PostFeedItemDto[]> {
  const chainIds: string[] = [];
  let currentId: string | null = commentId;
  let guard = 30;

  while (currentId && guard > 0) {
    const row: { id: string; parentId: string | null } | null = await prisma.post.findUnique({
      where: { id: currentId },
      select: { id: true, parentId: true },
    });
    if (!row || row.parentId === null) break; // không tìm thấy hoặc đã tới bài gốc — dừng, không đưa root vào chain
    chainIds.unshift(row.id);
    currentId = row.parentId;
    guard--;
  }

  if (chainIds.length === 0) return [];

  const rows = await prisma.post.findMany({
    where: { id: { in: chainIds } },
    include: postFeedInclude,
  });
  const rowMap = new Map(rows.map((r) => [r.id, r]));
  const orderedRows = chainIds.map((id) => rowMap.get(id)).filter((r) => r !== undefined);
  if (orderedRows.length === 0) return [];

  let viewerReactionMap = new Map<string, string>();
  if (viewerId) {
    const likes = await prisma.postLike.findMany({
      where: { userId: viewerId, postId: { in: orderedRows.map((r) => r.id) } },
      select: { postId: true, type: true },
    });
    viewerReactionMap = new Map(likes.map((l) => [l.postId, l.type]));
  }
  const savedSet = await getViewerSavedSet(
    viewerId ?? null,
    orderedRows.map((r) => r.id),
  );
  const topReactionsMap = await getTopReactionsMap(orderedRows.map((r) => r.id));
  const commentCountMap = await getCommentCountMap(orderedRows.map((r) => r.id));

  return orderedRows.map((r) =>
    mapPostToFeedItemDto(
      r,
      viewerReactionMap.get(r.id) ?? null,
      savedSet.has(r.id),
      topReactionsMap.get(r.id) ?? [],
      commentCountMap.get(r.id),
    ),
  );
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
  const blockedIds = viewerId ? await getBlockedRelatedUserIds(viewerId) : [];
  const blockedAuthorFilter = blockedUsersWhere(blockedIds, 'authorId');

  const where = cursorData
    ? {
        deletedAt: null,
        hiddenAt: null,
        parentId: postId,
        ...blockedAuthorFilter,
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
        ...blockedAuthorFilter,
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

  const tail = page[page.length - 1];
  const nextCursor = hasMore && tail ? encodeCursor(tail.createdAt, tail.id) : null;

  return { items, nextCursor };
}

import { type Prisma, prisma } from '@costy/db';

import { areFriends, getFriendIds } from '../friends/friends.service.js';

/**
 * Điều kiện Prisma lọc bài viết theo quyền xem (visibility) cho viewer:
 * - PUBLIC: ai cũng xem được
 * - tác giả là chính viewer: luôn xem được
 * - FRIENDS: chỉ bạn bè của tác giả
 * PRIVATE chỉ tác giả thấy (đã nằm trong nhánh authorId === viewer).
 */
export function buildVisibilityCondition(
  viewerId: string | null,
  friendIds: string[],
): Prisma.PostWhereInput {
  if (!viewerId) {
    return { visibility: 'PUBLIC' };
  }
  return {
    OR: [
      { visibility: 'PUBLIC' },
      { authorId: viewerId },
      { visibility: 'FRIENDS', authorId: { in: friendIds } },
    ],
  };
}

/** Lấy friendIds của viewer (rỗng nếu chưa đăng nhập) để dựng điều kiện visibility. */
export async function getViewerFriendIds(viewerId: string | null): Promise<string[]> {
  if (!viewerId) return [];
  return getFriendIds(viewerId);
}

/** Kiểm tra viewer có quyền xem 1 bài viết cụ thể không. */
export async function canViewPost(
  viewerId: string | null,
  post: { authorId: string; visibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE' },
): Promise<boolean> {
  if (post.visibility === 'PUBLIC') return true;
  if (!viewerId) return false;
  if (post.authorId === viewerId) return true;
  if (post.visibility === 'PRIVATE') return false;
  return areFriends(viewerId, post.authorId);
}

/** Tập postId mà viewer đã lưu (để điền savedByMe), rỗng nếu chưa đăng nhập. */
export async function getViewerSavedSet(
  viewerId: string | null,
  postIds: string[],
): Promise<Set<string>> {
  if (!viewerId || postIds.length === 0) return new Set();
  const saves = await prisma.postSave.findMany({
    where: { userId: viewerId, postId: { in: postIds } },
    select: { postId: true },
  });
  return new Set(saves.map((s) => s.postId));
}

const TOP_REACTIONS_LIMIT = 3;

/** Lấy top loại cảm xúc (tối đa 3) theo số lượng cho từng postId. */
export async function getTopReactionsMap(postIds: string[]): Promise<Map<string, string[]>> {
  if (postIds.length === 0) return new Map();

  const groups = await prisma.postLike.groupBy({
    by: ['postId', 'type'],
    where: { postId: { in: postIds } },
    _count: { type: true },
  });

  const byPost = new Map<string, { type: string; count: number }[]>();
  for (const row of groups) {
    const list = byPost.get(row.postId) ?? [];
    list.push({ type: row.type, count: row._count.type });
    byPost.set(row.postId, list);
  }

  const result = new Map<string, string[]>();
  for (const postId of postIds) {
    const sorted = (byPost.get(postId) ?? [])
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_REACTIONS_LIMIT)
      .map((entry) => entry.type);
    result.set(postId, sorted);
  }

  return result;
}

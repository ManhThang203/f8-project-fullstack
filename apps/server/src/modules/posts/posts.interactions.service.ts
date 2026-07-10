import { prisma } from '@costy/db';
import type { CursorPageQuery, PostFeedItemDto } from '@costy/shared';

import { AppError } from '../../lib/errors.js';
import { createNotification } from '../notifications/notifications.service.js';

import { getCommentCountMap } from './posts-count.js';
import { canViewPost, getTopReactionsMap } from './posts.access.js';
import { mapPostToFeedItemDto, postFeedInclude } from './posts.mapper.js';
import { decodeCursor, encodeCursor } from './posts.utils.js';

/** Đặt/gỡ reaction của user lên bài viết, trả về tổng like mới. */
export async function setPostReaction(postId: string, userId: string, reactionType: string | null) {
  // Check if post exists
  const post = await prisma.post.findUnique({
    where: { id: postId, deletedAt: null },
    select: { id: true, authorId: true, visibility: true },
  });
  if (!post) throw AppError.notFound('Bài viết không tồn tại');
  if (!(await canViewPost(userId, post))) {
    throw AppError.notFound('Bài viết không tồn tại hoặc đã bị xóa');
  }

  if (reactionType) {
    await prisma.postLike.upsert({
      where: { userId_postId: { userId, postId } },
      update: { type: reactionType },
      create: { userId, postId, type: reactionType },
    });

    if (userId !== post.authorId) {
      await createNotification({
        recipientId: post.authorId,
        actorId: userId,
        type: 'POST_LIKED',
        entityType: 'post',
        entityId: postId,
        reactionType,
      });
    }
  } else {
    await prisma.postLike.deleteMany({
      where: { userId, postId },
    });
  }

  // Lấy tổng like sau khi update
  const likeCount = await prisma.postLike.count({ where: { postId } });

  return { postId, reactionType, likeCount };
}

/** Lưu (bookmark) bài viết; idempotent. */
export async function savePost(postId: string, userId: string): Promise<{ savedByMe: boolean }> {
  const post = await prisma.post.findUnique({
    where: { id: postId, deletedAt: null },
    select: { id: true, authorId: true, visibility: true },
  });
  if (!post) throw AppError.notFound('Bài viết không tồn tại');
  if (!(await canViewPost(userId, post))) {
    throw AppError.forbidden('Bạn không có quyền lưu bài viết này');
  }

  await prisma.postSave.upsert({
    where: { userId_postId: { userId, postId } },
    update: {},
    create: { userId, postId },
  });
  return { savedByMe: true };
}

/** Bỏ lưu bài viết; idempotent. */
export async function unsavePost(
  postId: string,
  userId: string,
): Promise<{ savedByMe: boolean }> {
  await prisma.postSave.deleteMany({ where: { userId, postId } });
  return { savedByMe: false };
}

/** Ghi nhận một lượt chia sẻ và trả về tổng số lượt chia sẻ. */
export async function sharePost(
  postId: string,
  userId: string,
): Promise<{ shareCount: number }> {
  const post = await prisma.post.findUnique({
    where: { id: postId, deletedAt: null },
    select: { id: true, authorId: true, visibility: true },
  });
  if (!post) throw AppError.notFound('Bài viết không tồn tại');
  if (!(await canViewPost(userId, post))) {
    throw AppError.forbidden('Bạn không có quyền chia sẻ bài viết này');
  }

  await prisma.postShare.create({ data: { userId, postId } });
  const shareCount = await prisma.postShare.count({ where: { postId } });
  return { shareCount };
}

/** Danh sách bài viết mình đã lưu, phân trang cursor. */
export async function listSavedPosts(
  userId: string,
  query: CursorPageQuery,
): Promise<{ items: PostFeedItemDto[]; nextCursor: string | null }> {
  const cursorData = query.cursor ? decodeCursor(query.cursor) : null;

  const where = cursorData
    ? {
        userId,
        post: { deletedAt: null },
        OR: [
          { createdAt: { lt: cursorData.createdAt } },
          {
            AND: [{ createdAt: { equals: cursorData.createdAt } }, { postId: { lt: cursorData.id } }],
          },
        ],
      }
    : { userId, post: { deletedAt: null } };

  const rows = await prisma.postSave.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { postId: 'desc' }],
    take: query.limit + 1,
    include: { post: { include: postFeedInclude } },
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;

  let reactionMap = new Map<string, string>();
  if (page.length > 0) {
    const likes = await prisma.postLike.findMany({
      where: { userId, postId: { in: page.map((r) => r.postId) } },
      select: { postId: true, type: true },
    });
    reactionMap = new Map(likes.map((l) => [l.postId, l.type]));
  }

  const topReactionsMap = await getTopReactionsMap(page.map((r) => r.postId));
  const commentCountMap = await getCommentCountMap(page.map((r) => r.postId));

  const items = page.map((r) =>
    mapPostToFeedItemDto(
      r.post,
      reactionMap.get(r.postId) ?? null,
      true,
      topReactionsMap.get(r.postId) ?? [],
      commentCountMap.get(r.postId),
    ),
  );

  const tail = page[page.length - 1];
  const nextCursor = hasMore && tail ? encodeCursor(tail.createdAt, tail.postId) : null;

  return { items, nextCursor };
}

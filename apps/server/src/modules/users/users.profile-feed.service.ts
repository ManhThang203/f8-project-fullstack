import { MediaStatus, prisma } from '@costy/db';
import type {
  CursorPageQuery,
  PostFeedItemDto,
  ProfileGridItemDto,
  ProfilePostsQuery,
} from '@costy/shared';

import { AppError } from '../../lib/errors.js';
import { decodeCursor, paginate } from '../../lib/pagination/cursor.js';
import { listAuthorFeed } from '../posts/posts.service.js';

import {
  allowedVisibilitiesFor,
  assertProfileVisibleToViewer,
  findUserByUsername,
} from './users.access.js';
import { mapPostToGridItemDto, profilePostMediaKind } from './users.mapper.js';

/** Feed đầy đủ bài viết trên trang cá nhân (cả text-only), phân trang cursor. */
export async function listProfileFeed(
  username: string,
  query: CursorPageQuery,
  viewerId: string | null = null,
): Promise<{ items: PostFeedItemDto[]; nextCursor: string | null }> {
  const user = await findUserByUsername(username);
  if (!user) throw AppError.notFound('Không tìm thấy người dùng này');
  if (user.deletedAt) return { items: [], nextCursor: null };
  await assertProfileVisibleToViewer(viewerId, user.id);

  const allowedVisibilities = await allowedVisibilitiesFor(viewerId, user.id);
  return listAuthorFeed(user.id, allowedVisibilities, query, viewerId);
}

/** Danh sách bài viết dạng grid (ảnh hoặc video) của một user, phân trang cursor. */
export async function listProfilePosts(
  username: string,
  query: ProfilePostsQuery,
  viewerId: string | null = null,
): Promise<{ items: ProfileGridItemDto[]; nextCursor: string | null }> {
  const user = await findUserByUsername(username);
  if (!user) throw AppError.notFound('Không tìm thấy người dùng này');
  if (user.deletedAt) return { items: [], nextCursor: null };
  await assertProfileVisibleToViewer(viewerId, user.id);

  const mediaKind = profilePostMediaKind(query.kind);
  const cursorData = query.cursor ? decodeCursor(query.cursor) : null;
  const allowedVisibilities = await allowedVisibilitiesFor(viewerId, user.id);

  const baseWhere = {
    authorId: user.id,
    deletedAt: null,
    parentId: null,
    visibility: { in: allowedVisibilities },
    media: { some: { kind: mediaKind, status: MediaStatus.READY } },
  };

  const where = cursorData
    ? {
        ...baseWhere,
        OR: [
          { createdAt: { lt: cursorData.createdAt } },
          {
            AND: [{ createdAt: { equals: cursorData.createdAt } }, { id: { lt: cursorData.id } }],
          },
        ],
      }
    : baseWhere;

  const rows = await prisma.post.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: query.limit + 1,
    include: {
      media: {
        where: { kind: mediaKind, status: MediaStatus.READY },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
      _count: {
        select: {
          likes: true,
          replies: { where: { deletedAt: null } },
          media: { where: { kind: mediaKind, status: MediaStatus.READY } },
        },
      },
    },
  });

  const isVideo = query.kind === 'video';
  const { page, nextCursor } = paginate(rows, query.limit, (p) => ({
    createdAt: p.createdAt,
    id: p.id,
  }));

  return { items: page.map((p) => mapPostToGridItemDto(p, isVideo)), nextCursor };
}

/**
 * Danh sách bài viết đã thích dạng grid — chỉ chủ tài khoản mới được xem.
 * Phân trang theo (createdAt, postId) của bảng PostLike.
 */
export async function listProfileLikes(
  username: string,
  viewerId: string | null,
  query: ProfilePostsQuery,
): Promise<{ items: ProfileGridItemDto[]; nextCursor: string | null }> {
  const user = await findUserByUsername(username);
  if (!user) throw AppError.notFound('Không tìm thấy người dùng này');
  if (!viewerId || viewerId !== user.id) {
    throw AppError.forbidden('Chỉ chủ tài khoản mới xem được tab Đã thích');
  }

  const cursorData = query.cursor ? decodeCursor(query.cursor) : null;

  const baseWhere = {
    userId: user.id,
    post: {
      deletedAt: null,
      parentId: null,
      media: { some: { status: MediaStatus.READY } },
    },
  };

  const where = cursorData
    ? {
        ...baseWhere,
        OR: [
          { createdAt: { lt: cursorData.createdAt } },
          {
            AND: [
              { createdAt: { equals: cursorData.createdAt } },
              { postId: { lt: cursorData.id } },
            ],
          },
        ],
      }
    : baseWhere;

  const likes = await prisma.postLike.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { postId: 'desc' }],
    take: query.limit + 1,
    include: {
      post: {
        include: {
          media: {
            where: { status: MediaStatus.READY },
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
          _count: {
            select: {
              likes: true,
              replies: { where: { deletedAt: null } },
              media: { where: { status: MediaStatus.READY } },
            },
          },
        },
      },
    },
  });

  const { page, nextCursor } = paginate(likes, query.limit, (like) => ({
    createdAt: like.createdAt,
    id: like.postId,
  }));

  const items = page.map((like) => {
    const isVideo = like.post.media[0]?.kind === 'VIDEO';
    return mapPostToGridItemDto(like.post, isVideo);
  });

  return { items, nextCursor };
}

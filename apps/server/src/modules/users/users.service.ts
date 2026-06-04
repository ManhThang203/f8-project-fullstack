import { MediaStatus, NotificationType, prisma } from '@costy/db';
import type {
  FollowStateDto,
  ProfileDto,
  ProfileGridItemDto,
  ProfileListQuery,
  ProfilePostsQuery,
  UserSummaryDto,
} from '@costy/shared';

import { AppError } from '../../lib/errors.js';

import {
  mapPostToGridItemDto,
  mapUserToProfileDto,
  mapUserToSummaryDto,
  profilePostMediaKind,
} from './users.mapper.js';
import { createNotification } from '../notifications/notifications.service.js';

// ── Cursor helpers ─────────────────────────────────────────────────────────────

/** Mã hoá cursor phân trang thành base64url để an toàn đặt lên URL. */
function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ t: createdAt.toISOString(), id }), 'utf8').toString(
    'base64url',
  );
}

/** Giải mã cursor; ném 400 nếu chuỗi không hợp lệ. */
function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  try {
    const raw = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      t?: string;
      id?: string;
    };
    if (!raw.t || !raw.id) throw new Error('invalid cursor shape');
    return { createdAt: new Date(raw.t), id: raw.id };
  } catch {
    throw AppError.badRequest('Invalid cursor');
  }
}

/**
 * Cắt trang kết quả (offset-bằng-cursor): từ `rows` lấy đủ `limit` phần tử,
 * xác định `nextCursor` nếu còn dữ liệu tiếp theo.
 */
function paginate<TRow>(
  rows: TRow[],
  limit: number,
  getCursorParts: (row: TRow) => { createdAt: Date; id: string },
): { page: TRow[]; nextCursor: string | null } {
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const tail = page[page.length - 1];
  const nextCursor =
    hasMore && tail
      ? encodeCursor(getCursorParts(tail).createdAt, getCursorParts(tail).id)
      : null;
  return { page, nextCursor };
}

// ── DB helpers ──────────────────────────────────────────────────────────────────

/** Truy vấn user kèm số lượng bài viết, followers, following theo username. */
async function findUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      bio: true,
      image: true,
      createdAt: true,
      deletedAt: true,
      _count: {
        select: {
          posts: {
            where: { deletedAt: null, parentId: null },
          },
          followers: true,
          following: true,
        },
      },
    },
  });
}

/** Kiểm tra viewer có đang follow target không; trả false nếu không auth hoặc tự follow. */
async function isViewerFollowing(viewerId: string | null, targetId: string): Promise<boolean> {
  if (!viewerId || viewerId === targetId) return false;
  const row = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: viewerId, followingId: targetId } },
    select: { followerId: true },
  });
  return Boolean(row);
}

// ── Exports ─────────────────────────────────────────────────────────────────────

/** Lấy thông tin profile công khai của một user theo username. */
export async function getProfile(username: string, viewerId: string | null): Promise<ProfileDto> {
  const user = await findUserByUsername(username);
  if (!user) throw AppError.notFound('Không tìm thấy người dùng này');

  const isOwner = viewerId === user.id;
  const isFollowing = await isViewerFollowing(viewerId, user.id);

  return mapUserToProfileDto(user, { isOwner, isFollowing });
}

/** Danh sách bài viết dạng grid (ảnh hoặc video) của một user, phân trang cursor. */
export async function listProfilePosts(
  username: string,
  query: ProfilePostsQuery,
): Promise<{ items: ProfileGridItemDto[]; nextCursor: string | null }> {
  const user = await findUserByUsername(username);
  if (!user) throw AppError.notFound('Không tìm thấy người dùng này');
  if (user.deletedAt) return { items: [], nextCursor: null };

  const mediaKind = profilePostMediaKind(query.kind);
  const cursorData = query.cursor ? decodeCursor(query.cursor) : null;

  const baseWhere = {
    authorId: user.id,
    deletedAt: null,
    parentId: null,
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
            AND: [{ createdAt: { equals: cursorData.createdAt } }, { postId: { lt: cursorData.id } }],
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

/** Dùng chung cho listFollowers / listFollowing, mode quyết định chiều quan hệ. */
async function listFollowUsers(
  username: string,
  mode: 'followers' | 'following',
  viewerId: string | null,
  query: ProfileListQuery,
): Promise<{ items: UserSummaryDto[]; nextCursor: string | null }> {
  const user = await findUserByUsername(username);
  if (!user) throw AppError.notFound('Không tìm thấy người dùng này');

  const needle = query.q?.trim();
  const cursorData = query.cursor ? decodeCursor(query.cursor) : null;

  const userFilter = needle
    ? {
        OR: [
          { username: { contains: needle, mode: 'insensitive' as const } },
          { name: { contains: needle, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const baseWhere =
    mode === 'followers'
      ? { followingId: user.id, follower: { deletedAt: null, ...userFilter } }
      : { followerId: user.id, following: { deletedAt: null, ...userFilter } };

  const where = cursorData
    ? {
        ...baseWhere,
        OR: [
          { createdAt: { lt: cursorData.createdAt } },
          {
            AND: [
              { createdAt: { equals: cursorData.createdAt } },
              mode === 'followers'
                ? { followerId: { lt: cursorData.id } }
                : { followingId: { lt: cursorData.id } },
            ],
          },
        ],
      }
    : baseWhere;

  const rows = await prisma.follow.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, mode === 'followers' ? { followerId: 'desc' } : { followingId: 'desc' }],
    take: query.limit + 1,
    include: {
      follower: { select: { id: true, username: true, name: true, image: true } },
      following: { select: { id: true, username: true, name: true, image: true } },
    },
  });

  const { page, nextCursor } = paginate(rows, query.limit, (r) => ({
    createdAt: r.createdAt,
    id: mode === 'followers' ? r.followerId : r.followingId,
  }));

  // Batch-check viewer đang follow ai trong danh sách để điền isFollowing.
  const userIds = page.map((r) => (mode === 'followers' ? r.follower : r.following).id);
  const viewerFollowing = viewerId
    ? await prisma.follow.findMany({
        where: { followerId: viewerId, followingId: { in: userIds } },
        select: { followingId: true },
      })
    : [];
  const followingSet = new Set(viewerFollowing.map((f) => f.followingId));

  const items = page.map((r) => {
    const u = mode === 'followers' ? r.follower : r.following;
    return mapUserToSummaryDto(u, followingSet);
  });

  return { items, nextCursor };
}

/** Danh sách người đang follow user này, có hỗ trợ tìm kiếm và phân trang cursor. */
export async function listFollowers(
  username: string,
  viewerId: string | null,
  query: ProfileListQuery,
) {
  return listFollowUsers(username, 'followers', viewerId, query);
}

/** Danh sách người mà user này đang follow, có hỗ trợ tìm kiếm và phân trang cursor. */
export async function listFollowing(
  username: string,
  viewerId: string | null,
  query: ProfileListQuery,
) {
  return listFollowUsers(username, 'following', viewerId, query);
}

/** Follow một user; idempotent (không báo lỗi nếu đã follow). Tạo notification khi follow mới. */
export async function followUser(followerId: string, targetId: string): Promise<FollowStateDto> {
  if (followerId === targetId) {
    throw AppError.badRequest('Không thể theo dõi chính mình');
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, deletedAt: true },
  });
  if (!target || target.deletedAt) {
    throw AppError.notFound('Không tìm thấy người dùng này');
  }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId: targetId } },
  });

  if (!existing) {
    await prisma.follow.create({
      data: { followerId, followingId: targetId },
    });

    await createNotification({
      recipientId: targetId,
      actorId: followerId,
      type: 'USER_FOLLOWED',
      entityType: 'user',
      entityId: followerId,
    });
  }

  return { isFollowing: true };
}

/** Hủy follow; idempotent (không lỗi nếu chưa follow). */
export async function unfollowUser(followerId: string, targetId: string): Promise<FollowStateDto> {
  await prisma.follow.deleteMany({
    where: { followerId, followingId: targetId },
  });
  return { isFollowing: false };
}

export { listUsersForPicker } from './users.service.picker.js';

import { prisma } from '@costy/db';
import type { FollowStateDto, ProfileListQuery, UserSummaryDto } from '@costy/shared';

import { assertUsersNotBlocked } from '../../lib/blocks/block-utils.js';
import { AppError } from '../../lib/errors.js';
import { decodeCursor, paginate } from '../../lib/pagination/cursor.js';
import { createNotification } from '../notifications/notifications.service.js';

import { findUserByUsername } from './users.access.js';
import { mapUserToSummaryDto } from './users.mapper.js';

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
    orderBy: [
      { createdAt: 'desc' },
      mode === 'followers' ? { followerId: 'desc' } : { followingId: 'desc' },
    ],
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

  await assertUsersNotBlocked(followerId, targetId);

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

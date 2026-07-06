import { prisma } from '@costy/db';

import { areUsersBlocked } from '../../lib/blocks/block-utils.js';
import { AppError } from '../../lib/errors.js';
import { areFriends } from '../friends/friends.service.js';

/** Truy vấn user kèm số lượng bài viết, followers, following theo username. */
export async function findUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      bio: true,
      image: true,
      coverImage: true,
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

/** Ẩn profile và nội dung của target nếu hai user đang chặn nhau. */
export async function assertProfileVisibleToViewer(viewerId: string | null, targetId: string) {
  if (!viewerId || viewerId === targetId) return;
  const blocked = await areUsersBlocked(viewerId, targetId);
  if (blocked) throw AppError.notFound('Không tìm thấy người dùng này');
}

/** Danh sách visibility mà viewer được phép xem trên profile của một user. */
export async function allowedVisibilitiesFor(
  viewerId: string | null,
  authorId: string,
): Promise<Array<'PUBLIC' | 'FRIENDS' | 'PRIVATE'>> {
  if (viewerId === authorId) return ['PUBLIC', 'FRIENDS', 'PRIVATE'];
  if (viewerId && (await areFriends(viewerId, authorId))) return ['PUBLIC', 'FRIENDS'];
  return ['PUBLIC'];
}

import { HashtagStatus, prisma } from '@costy/db';
import type { HashtagSearchResultDto, UserSearchResultDto } from '@costy/shared';

import { blockedUsersWhere, getBlockedRelatedUserIds } from '../../lib/blocks/block-utils.js';

/** Tìm người dùng theo username / tên hiển thị, kèm trạng thái follow của viewer. */
export async function searchUsers(
  query: string,
  limit: number,
  viewerId: string | null,
): Promise<UserSearchResultDto[]> {
  const needle = query.trim().replace(/^@/, '');
  if (!needle) return [];

  const blockedIds = viewerId ? await getBlockedRelatedUserIds(viewerId) : [];

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      ...blockedUsersWhere(blockedIds),
      OR: [
        { username: { contains: needle, mode: 'insensitive' } },
        { name: { contains: needle, mode: 'insensitive' } },
      ],
    },
    select: { id: true, username: true, name: true, image: true },
    orderBy: [{ username: 'asc' }],
    take: limit,
  });

  let followingSet = new Set<string>();
  if (viewerId && users.length > 0) {
    const follows = await prisma.follow.findMany({
      where: { followerId: viewerId, followingId: { in: users.map((u) => u.id) } },
      select: { followingId: true },
    });
    followingSet = new Set(follows.map((f) => f.followingId));
  }

  return users.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    image: u.image,
    isFollowing: followingSet.has(u.id),
  }));
}

/** Tìm hashtag theo chuỗi (bỏ dấu #), sắp theo số bài viết giảm dần. */
export async function searchHashtags(
  query: string,
  limit: number,
): Promise<HashtagSearchResultDto[]> {
  const needle = query.trim().replace(/^#/, '');
  if (!needle) return [];

  const rows = await prisma.hashtag.findMany({
    where: {
      status: HashtagStatus.ACTIVE,
      tag: { contains: needle, mode: 'insensitive' },
    },
    select: { id: true, tag: true, _count: { select: { posts: true } } },
    take: limit,
  });

  return rows
    .map((h) => ({ id: h.id, tag: h.tag, postCount: h._count.posts }))
    .sort((a, b) => b.postCount - a.postCount);
}

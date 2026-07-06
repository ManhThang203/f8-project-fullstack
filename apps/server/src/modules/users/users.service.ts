import { prisma } from '@costy/db';
import type { ProfileDto } from '@costy/shared';

import { AppError } from '../../lib/errors.js';
import { countFriends, getFriendStatus } from '../friends/friends.service.js';

import { assertProfileVisibleToViewer, findUserByUsername } from './users.access.js';
import { mapUserToProfileDto } from './users.mapper.js';

export { listUsersForPicker } from './users.service.picker.js';
export {
  followUser,
  listFollowers,
  listFollowing,
  unfollowUser,
} from './users.follow.service.js';
export {
  listProfileFeed,
  listProfileLikes,
  listProfilePosts,
} from './users.profile-feed.service.js';

/** Kiểm tra viewer có đang follow target không; trả false nếu không auth hoặc tự follow. */
async function isViewerFollowing(viewerId: string | null, targetId: string): Promise<boolean> {
  if (!viewerId || viewerId === targetId) return false;
  const row = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: viewerId, followingId: targetId } },
    select: { followerId: true },
  });
  return Boolean(row);
}

/** Lấy thông tin profile công khai của một user theo username. */
export async function getProfile(username: string, viewerId: string | null): Promise<ProfileDto> {
  const user = await findUserByUsername(username);
  if (!user) throw AppError.notFound('Không tìm thấy người dùng này');

  await assertProfileVisibleToViewer(viewerId, user.id);

  const isOwner = viewerId === user.id;
  const isFollowing = await isViewerFollowing(viewerId, user.id);
  const [friendStatus, friendsCount] = await Promise.all([
    getFriendStatus(viewerId, user.id),
    countFriends(user.id),
  ]);

  return mapUserToProfileDto(user, { isOwner, isFollowing, friendStatus, friendsCount });
}

/** Cập nhật tên / tiểu sử của chính mình, trả về ProfileDto mới. */
export async function updateMyProfile(
  userId: string,
  body: { name?: string; bio?: string | null },
): Promise<ProfileDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });
  if (!user) throw AppError.notFound('Không tìm thấy người dùng này');

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.bio !== undefined ? { bio: body.bio } : {}),
    },
  });

  return getProfile(user.username, userId);
}

/** Cập nhật URL ảnh đại diện hoặc ảnh bìa cho user. */
export async function setProfileImage(
  userId: string,
  field: 'image' | 'coverImage',
  url: string,
): Promise<{ url: string }> {
  await prisma.user.update({
    where: { id: userId },
    data: { [field]: url },
  });
  return { url };
}

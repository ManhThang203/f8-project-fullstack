/**
 * Mapper: chuyển Prisma row → DTO cho module users.
 */

import { MediaKind, type Follow, type Media, type Post, type User } from '@costy/db';
import type { ProfileDto, ProfileGridItemDto, UserSummaryDto } from '@costy/shared';

type UserProfileRow = Pick<
  User,
  'id' | 'username' | 'name' | 'bio' | 'image' | 'createdAt' | 'deletedAt'
> & {
  _count: {
    posts: number;
    followers: number;
    following: number;
  };
};

/** Chuyển user row + trạng thái quan hệ viewer thành ProfileDto trả về client. */
export function mapUserToProfileDto(
  user: UserProfileRow,
  opts: { isOwner: boolean; isFollowing: boolean },
): ProfileDto {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    bio: user.bio,
    image: user.image,
    createdAt: user.createdAt.toISOString(),
    deletedAt: user.deletedAt?.toISOString() ?? null,
    counts: {
      posts: user._count.posts,
      followers: user._count.followers,
      following: user._count.following,
    },
    isOwner: opts.isOwner,
    isFollowing: opts.isFollowing,
  };
}

type PostGridRow = Post & {
  media: Media[];
  _count: { likes: number; replies: number; media: number };
};

/** Chuyển post row thành một ô grid (thumbnail + số lượng like/reply/media). */
export function mapPostToGridItemDto(post: PostGridRow, isVideo: boolean): ProfileGridItemDto {
  const thumb = post.media[0];
  return {
    postId: post.id,
    thumbnailUrl: thumb?.publicUrl ?? '',
    mediaCount: post._count.media,
    likeCount: post._count.likes,
    replyCount: post._count.replies,
    createdAt: post.createdAt.toISOString(),
    isVideo,
  };
}

type UserSummaryRow = Pick<User, 'id' | 'username' | 'name' | 'image'> & {
  followers?: Follow[];
};

/** Chuyển user row thành UserSummaryDto, điền isFollowing từ set id viewer đang follow. */
export function mapUserToSummaryDto(
  user: UserSummaryRow,
  viewerFollowingIds: Set<string>,
): UserSummaryDto {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    image: user.image,
    isFollowing: viewerFollowingIds.has(user.id),
  };
}

/** Map kind query string ('image' | 'video') sang MediaKind enum của Prisma. */
export const profilePostMediaKind = (kind: 'image' | 'video') =>
  kind === 'video' ? MediaKind.VIDEO : MediaKind.IMAGE;

import type { FriendStatus } from './friend.js';

/** Profile header payload for GET /users/:username */
export interface ProfileDto {
  id: string;
  username: string;
  name: string | null;
  bio: string | null;
  image: string | null;
  coverImage: string | null;
  createdAt: string;
  deletedAt: string | null;
  counts: {
    posts: number;
    followers: number;
    following: number;
    friends: number;
  };
  isOwner: boolean;
  isFollowing: boolean;
  friendStatus: FriendStatus;
}

/** Single tile in profile media grid */
export interface ProfileGridItemDto {
  postId: string;
  /** URL hiển thị trên ô grid (ảnh hoặc thumbnail JPG của video). */
  thumbnailUrl: string;
  /** URL gốc media — dùng phát video trong lightbox. */
  mediaUrl: string;
  mediaCount: number;
  likeCount: number;
  replyCount: number;
  createdAt: string;
  isVideo: boolean;
}

export interface ProfileGridMeta {
  nextCursor: string | null;
}

/** User row in followers/following lists */
export interface UserSummaryDto {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  isFollowing: boolean;
}

export interface UserListMeta {
  nextCursor: string | null;
}

export interface FollowStateDto {
  isFollowing: boolean;
}

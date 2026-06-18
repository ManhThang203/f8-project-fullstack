/** Public author snippet embedded in post payloads. */
export interface PostAuthorDto {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
}

export type PostMediaType = 'image' | 'video';

/** Single media item attached to a post. */
export interface PostMediaDto {
  id: string;
  type: PostMediaType;
  url: string;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  position: number;
}

export type PostVisibilityDto = 'PUBLIC' | 'FRIENDS' | 'PRIVATE';

/** Single item in the home feed. */
export interface PostFeedItemDto {
  id: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  visibility: PostVisibilityDto;
  author: PostAuthorDto;
  replyCount: number;
  likeCount: number;
  shareCount: number;
  myReaction: string | null;
  savedByMe: boolean;
  /** Loại cảm xúc nhiều nhất (tối đa 3), sort theo số lượng giảm dần. */
  topReactions: string[];
  media: PostMediaDto[];
}

export interface PostFeedMeta {
  nextCursor: string | null;
}

/** Single item in the reels feed. */
export interface ReelsFeedItemDto {
  id: string;
  content: string;
  createdAt: string;
  author: PostAuthorDto;
  replyCount: number;
  likeCount: number;
  shareCount: number;
  myReaction: string | null;
  savedByMe: boolean;
  /** Loại cảm xúc nhiều nhất (tối đa 3), sort theo số lượng giảm dần. */
  topReactions: string[];
  isFollowing: boolean;
  video: PostMediaDto;
}

export interface ReelsFeedMeta {
  nextCursor: string | null;
}

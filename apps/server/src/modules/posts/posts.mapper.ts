import { MediaKind, MediaStatus, type Media, type Post, type User } from '@threads/db';
import type { PostAuthorDto, PostFeedItemDto, PostMediaDto, PostMediaType, ReelsFeedItemDto } from '@threads/shared';

type PostWithAuthorAndMedia = Post & {
  author: Pick<User, 'id' | 'username' | 'name' | 'image'>;
  media: Media[];
  _count: { replies: number };
};

function mediaKindToType(kind: MediaKind): PostMediaType {
  return kind === 'VIDEO' ? 'video' : 'image';
}

function mapMediaRow(m: Media, position: number): PostMediaDto {
  return {
    id: m.id,
    type: mediaKindToType(m.kind),
    url: m.publicUrl ?? '',
    width: m.width,
    height: m.height,
    durationMs: m.durationMs,
    position,
  };
}

/** Single mapper for list + create — keeps API shape identical for the frontend. */
export function mapPostToFeedItemDto(post: PostWithAuthorAndMedia): PostFeedItemDto {
  const sortedMedia = [...post.media].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  return {
    id: post.id,
    content: post.content,
    createdAt: post.createdAt.toISOString(),
    author: {
      id: post.author.id,
      username: post.author.username,
      name: post.author.name,
      image: post.author.image,
    },
    replyCount: post._count.replies,
    media: sortedMedia.map((m, index) => mapMediaRow(m, index)),
  };
}

type PostReelRow = Post & {
  author: Pick<User, 'id' | 'username' | 'name' | 'image'>;
  media: Media[];
  _count: { replies: number; likes: number };
};

/** Mapper for reels feed — requires at least one VIDEO media. Returns null if no video found. */
export function mapPostToReelsFeedItemDto(
  post: PostReelRow,
  isFollowing: boolean,
): ReelsFeedItemDto | null {
  const videoMedia = post.media
    .filter((m) => m.kind === MediaKind.VIDEO)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

  if (!videoMedia) return null;

  const author: PostAuthorDto = {
    id: post.author.id,
    username: post.author.username,
    name: post.author.name,
    image: post.author.image,
  };

  return {
    id: post.id,
    content: post.content,
    createdAt: post.createdAt.toISOString(),
    author,
    replyCount: post._count.replies,
    likeCount: post._count.likes,
    isFollowing,
    video: mapMediaRow(videoMedia, 0),
  };
}

export const postReelInclude = {
  author: {
    select: { id: true, username: true, name: true, image: true },
  },
  media: {
    where: { kind: MediaKind.VIDEO, status: MediaStatus.READY },
    orderBy: { createdAt: 'asc' as const },
  },
  _count: { select: { replies: true, likes: true } },
} as const;

export const postFeedInclude = {
  author: {
    select: { id: true, username: true, name: true, image: true },
  },
  media: {
    where: { status: { not: MediaStatus.FAILED } },
    orderBy: { createdAt: 'asc' as const },
  },
  _count: { select: { replies: true } },
} as const;

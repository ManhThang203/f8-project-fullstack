import { MediaKind, MediaStatus, type Media, type Post, type User } from '@threads/db';
import type { PostFeedItemDto, PostMediaDto, PostMediaType } from '@threads/shared';

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

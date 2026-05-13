import { prisma } from '@threads/db';
import type { CreatePostBody, CursorPageQuery, PostFeedItemDto } from '@threads/shared';

import { AppError } from '../../lib/errors.js';

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ t: createdAt.toISOString(), id }), 'utf8').toString('base64url');
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  try {
    const raw = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { t?: string; id?: string };
    if (!raw.t || !raw.id) throw new Error('invalid cursor shape');
    return { createdAt: new Date(raw.t), id: raw.id };
  } catch {
    throw AppError.badRequest('Invalid cursor');
  }
}

export async function listFeed(query: CursorPageQuery): Promise<{
  items: PostFeedItemDto[];
  nextCursor: string | null;
}> {
  const take = query.limit + 1;
  const cursorData = query.cursor ? decodeCursor(query.cursor) : null;

  const where = cursorData
    ? {
        deletedAt: null,
        parentId: null,
        OR: [
          { createdAt: { lt: cursorData.createdAt } },
          { AND: [{ createdAt: { equals: cursorData.createdAt } }, { id: { lt: cursorData.id } }] },
        ],
      }
    : {
        deletedAt: null,
        parentId: null,
      };

  const rows = await prisma.post.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: {
        select: { id: true, username: true, name: true, image: true },
      },
      _count: { select: { replies: true } },
    },
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;

  const items: PostFeedItemDto[] = page.map((p) => ({
    id: p.id,
    content: p.content,
    createdAt: p.createdAt.toISOString(),
    author: p.author,
    replyCount: p._count.replies,
  }));

  const tail = page[page.length - 1];
  const nextCursor = hasMore && tail ? encodeCursor(tail.createdAt, tail.id) : null;

  return { items, nextCursor };
}

export async function createPost(authorId: string, body: CreatePostBody): Promise<PostFeedItemDto> {
  if (body.parentId) {
    const parent = await prisma.post.findFirst({
      where: { id: body.parentId, deletedAt: null },
      select: { id: true },
    });
    if (!parent) throw AppError.notFound('Parent post not found');
  }

  const post = await prisma.post.create({
    data: {
      authorId,
      content: body.content,
      parentId: body.parentId,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: {
        select: { id: true, username: true, name: true, image: true },
      },
      _count: { select: { replies: true } },
    },
  });

  return {
    id: post.id,
    content: post.content,
    createdAt: post.createdAt.toISOString(),
    author: post.author,
    replyCount: post._count.replies,
  };
}

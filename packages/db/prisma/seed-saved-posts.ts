import type { PrismaClient } from '../generated/prisma/client.js';

export const SEED_SAVED_POSTS_COUNT = 100;

/** Seed 100 bài đã lưu cho user từ các bài seed gốc (idempotent theo pool bài seed). */
export async function seedSavedPostsForUser(
  prisma: PrismaClient,
  userId: string,
): Promise<{ removed: number; created: number }> {
  const posts = await prisma.post.findMany({
    where: {
      parentId: null,
      deletedAt: null,
      OR: [
        { content: { startsWith: 'Bài seed ' } },
        { content: { startsWith: 'Bài seed bulk' } },
      ],
    },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
    take: SEED_SAVED_POSTS_COUNT,
  });

  if (posts.length === 0) {
    return { removed: 0, created: 0 };
  }

  const postIds = posts.map((post) => post.id);
  const removed = await prisma.postSave.deleteMany({
    where: { userId, postId: { in: postIds } },
  });

  const now = Date.now();
  const saves = posts.map((post, index) => ({
    userId,
    postId: post.id,
    createdAt: new Date(now - index * 60_000),
  }));

  const created = await prisma.postSave.createMany({ data: saves });
  return { removed: removed.count, created: created.count };
}

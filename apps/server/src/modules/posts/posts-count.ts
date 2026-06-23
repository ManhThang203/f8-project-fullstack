import { prisma } from '@costy/db';

/** Lấy map rootPostId -> tổng bình luận mọi cấp (batch groupBy). */
export async function getCommentCountMap(rootPostIds: string[]): Promise<Map<string, number>> {
  const rootIds = [...new Set(rootPostIds)];
  if (rootIds.length === 0) return new Map();

  const groups = await prisma.post.groupBy({
    by: ['rootPostId'],
    where: {
      rootPostId: { in: rootIds },
      deletedAt: null,
      hiddenAt: null,
    },
    _count: { _all: true },
  });
  const map = new Map<string, number>();
  for (const g of groups) {
    if (g.rootPostId) map.set(g.rootPostId, g._count._all);
  }

  let parentToRoot = new Map(rootIds.map((id) => [id, id]));
  let depth = 0;

  while (parentToRoot.size > 0 && depth < 10) {
    const legacyComments = await prisma.post.findMany({
      where: {
        parentId: { in: [...parentToRoot.keys()] },
        rootPostId: null,
        deletedAt: null,
        hiddenAt: null,
      },
      select: { id: true, parentId: true },
    });

    const nextParentToRoot = new Map<string, string>();
    for (const comment of legacyComments) {
      if (!comment.parentId) continue;
      const rootId = parentToRoot.get(comment.parentId);
      if (!rootId) continue;
      map.set(rootId, (map.get(rootId) ?? 0) + 1);
      nextParentToRoot.set(comment.id, rootId);
    }

    parentToRoot = nextParentToRoot;
    depth += 1;
  }

  return map;
}

/** Đếm commentCount cho 1 root post (nếu cần). */
export async function getCommentCountForRoot(rootPostId: string): Promise<number> {
  const map = await getCommentCountMap([rootPostId]);
  return map.get(rootPostId) ?? 0;
}

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const prismaDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(prismaDir, '../../..');
dotenv.config({ path: path.join(repoRoot, '.env') });
dotenv.config({ path: path.join(repoRoot, '.env.local') });

const { prisma } = await import('../src/index.js');

const BATCH_SIZE = 500;

/**
 * Tìm id của post gốc (post không có parentId) cho một comment.
 * Sử dụng bộ nhớ đệm (memo) để giảm query khi xử lý batch.
 */
async function resolveRootId(
  startId: string,
  memo: Map<string, string | null>,
): Promise<string> {
  let currentId = startId;
  const visited: string[] = [];

  while (true) {
    if (memo.has(currentId)) {
      const cachedRoot = memo.get(currentId);
      // Ghi nhớ cho toàn bộ chuỗi đã duyệt
      let root = cachedRoot ?? currentId; // nếu null nghĩa là chính nó là gốc
      for (const v of visited) {
        memo.set(v, root);
      }
      return root;
    }

    const row = await prisma.post.findUnique({
      where: { id: currentId },
      select: { id: true, parentId: true, rootPostId: true },
    });

    if (!row) {
      // fallback: coi như chính nó
      memo.set(currentId, currentId);
      return currentId;
    }

    visited.push(currentId);

    if (row.rootPostId) {
      // Đã có sẵn, dùng luôn
      for (const v of visited) memo.set(v, row.rootPostId);
      memo.set(row.id, row.rootPostId);
      return row.rootPostId;
    }

    if (!row.parentId) {
      // Đây là gốc
      memo.set(row.id, null); // gốc để rootPostId = null
      for (const v of visited) memo.set(v, row.id);
      return row.id;
    }

    currentId = row.parentId;
  }
}

/** Backfill rootPostId cho các comment chưa có (parentId != null và rootPostId null). */
export async function backfillRootPostIds() {
  console.log('[backfill-root] Bắt đầu backfill rootPostId cho comments...');

  let totalUpdated = 0;
  let hasMore = true;

  while (hasMore) {
    const comments = await prisma.post.findMany({
      where: {
        parentId: { not: null },
        rootPostId: null,
        deletedAt: null,
      },
      select: { id: true, parentId: true },
      take: BATCH_SIZE,
      orderBy: { createdAt: 'asc' },
    });

    if (comments.length === 0) {
      hasMore = false;
      break;
    }

    const memo = new Map<string, string | null>();

    const updates: Array<{ id: string; rootPostId: string }> = [];

    for (const c of comments) {
      const rootId = await resolveRootId(c.id, memo);
      // Chỉ set nếu khác id hiện tại (vì gốc thì rootPostId = null)
      if (rootId !== c.id) {
        updates.push({ id: c.id, rootPostId: rootId });
      } else {
        // Nếu rootId === c.id nghĩa là nó là gốc, nhưng logic where đã lọc parentId != null
        // hiếm, bỏ qua hoặc set null
      }
    }

    if (updates.length > 0) {
      // Sử dụng transaction batch update
      await prisma.$transaction(
        updates.map((u) =>
          prisma.post.update({
            where: { id: u.id },
            data: { rootPostId: u.rootPostId },
          }),
        ),
      );
      totalUpdated += updates.length;
      console.log(`[backfill-root] Đã cập nhật ${updates.length} records (tổng: ${totalUpdated})`);
    }

    // Nếu số lượng < batch, có thể đã hết
    if (comments.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  console.log(`[backfill-root] Hoàn tất. Tổng số comment đã backfill: ${totalUpdated}`);
}

backfillRootPostIds()
  .catch((err) => {
    console.error('[backfill-root] Lỗi:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

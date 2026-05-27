/**
 * Backfill embedding cho post gốc chưa có row post_embeddings.
 * Chạy: pnpm search:backfill-embeddings
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config as loadDotenv } from 'dotenv';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
loadDotenv({ path: path.join(repoRoot, '.env') });
loadDotenv({ path: path.join(repoRoot, '.env.local') });

const { prisma, Prisma } = await import('@threads/db');
const { getPostContentEmbedding, upsertPostEmbedding } = await import(
  '../src/lib/search/post-embed.js'
);

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1_500;

type PendingRow = {
  id: string;
  content: string;
};

/** Delay giữa batch để tránh gateway rate limit. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Lấy batch post gốc chưa có embedding. */
async function fetchPendingBatch(): Promise<PendingRow[]> {
  return prisma.$queryRaw<PendingRow[]>(
    Prisma.sql`
      SELECT p.id, p.content
      FROM posts p
      LEFT JOIN post_embeddings pe ON pe."postId" = p.id
      WHERE p."parentId" IS NULL
        AND p."deletedAt" IS NULL
        AND pe."postId" IS NULL
        AND LENGTH(TRIM(p.content)) > 0
      ORDER BY p."createdAt" ASC
      LIMIT ${BATCH_SIZE}
    `,
  );
}

async function main(): Promise<void> {
  let total = 0;

  for (;;) {
    const batch = await fetchPendingBatch();
    if (batch.length === 0) break;

    for (const row of batch) {
      const vector = await getPostContentEmbedding(row.content);
      await upsertPostEmbedding(row.id, vector);
      total += 1;
      // eslint-disable-next-line no-console
      console.log(`Indexed ${total}: ${row.id}`);
    }

    if (batch.length < BATCH_SIZE) break;
    await sleep(BATCH_DELAY_MS);
  }

  // eslint-disable-next-line no-console
  console.log(`Backfill complete. Indexed ${total} posts.`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Backfill failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

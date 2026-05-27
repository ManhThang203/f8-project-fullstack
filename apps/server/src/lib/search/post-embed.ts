import { prisma, Prisma } from '@threads/db';

import { EMBEDDING_MODEL, getGatewayClient } from '../ai-gateway.js';
import { logger } from '../logger.js';

/** Gọi Vercel AI Gateway embed nội dung post — không dùng chung cache query. */
export async function getPostContentEmbedding(content: string): Promise<number[]> {
  const normalized = content.trim();
  if (!normalized) {
    throw new Error('Post content is empty');
  }

  const gateway = getGatewayClient();
  const response = await gateway.embeddings.create({
    model: EMBEDDING_MODEL,
    input: normalized,
  });
  const vector = response.data[0]?.embedding;
  if (!vector) {
    throw new Error('Vercel AI Gateway returned empty embedding');
  }
  return vector;
}

/** Upsert embedding vector cho post vào bảng post_embeddings (raw SQL pgvector). */
export async function upsertPostEmbedding(postId: string, vector: number[]): Promise<void> {
  const vectorLiteral = `[${vector.join(',')}]`;

  try {
    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO post_embeddings ("postId", embedding, "createdAt")
        VALUES (${postId}, CAST(${vectorLiteral} AS vector), NOW())
        ON CONFLICT ("postId") DO UPDATE SET embedding = EXCLUDED.embedding
      `,
    );
  } catch (err) {
    logger.error({ err, postId }, 'upsertPostEmbedding failed');
    throw err;
  }
}

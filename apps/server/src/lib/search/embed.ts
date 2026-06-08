import { createHash } from 'node:crypto';

import { EMBEDDING_MODEL, getGatewayClient, isEmbeddingConfigured } from '../ai-gateway.js';
import { logger } from '../logger.js';
import { redis } from '../redis.js';

const CACHE_TTL_SEC = 86_400;

/** Lấy embedding vector cho query search; cache Redis theo SHA-256 của query. */
export async function getQueryEmbedding(query: string): Promise<number[] | null> {
  const normalized = query.trim();
  if (!normalized || !isEmbeddingConfigured()) return null;

  const cacheKey = `embed:query:${createHash('sha256').update(normalized).digest('hex')}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as number[];
    }
  } catch (err) {
    logger.warn({ err }, 'Redis cache read failed for query embedding');
  }

  try {
    const gateway = getGatewayClient();
    const response = await gateway.embeddings.create({
      model: EMBEDDING_MODEL,
      input: normalized,
    });
    const vector = response.data[0]?.embedding;
    if (!vector) return null;

    try {
      await redis.setex(cacheKey, CACHE_TTL_SEC, JSON.stringify(vector));
    } catch (err) {
      logger.warn({ err }, 'Redis cache write failed for query embedding');
    }

    return vector;
  } catch (err) {
    logger.error({ err }, 'Vercel AI Gateway query embedding failed');
    return null;
  }
}

import { describe, expect, it } from 'vitest';
import { prisma } from '@threads/db';

import { isEmbeddingConfigured } from '../../lib/ai-gateway.js';
import { hybridSearch } from './hybrid-search.js';

describe('search smoke', () => {
  it('migration applied: search_vector column exists', async () => {
    const rows = await prisma.$queryRaw<{ sv: string | null }[]>`
      SELECT search_vector::text AS sv FROM posts LIMIT 1
    `;
    expect(rows).toBeDefined();
  });

  it('hybridSearch returns valid result shape', async () => {
    const skipOpenAi =
      process.env.SKIP_EMBEDDING_TESTS === 'true' || !isEmbeddingConfigured();

    const { results, searchMode } = await hybridSearch('test', { limit: 5 });

    expect(['hybrid', 'fulltext-only']).toContain(searchMode);
    expect(Array.isArray(results)).toBe(true);

    if (!skipOpenAi && results.length > 0) {
      const first = results[0]!;
      expect(first).toMatchObject({
        id: expect.any(String),
        content: expect.any(String),
        author: expect.objectContaining({ username: expect.any(String) }),
      });
    }
  });
});

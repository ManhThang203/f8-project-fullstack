import { afterAll, describe, expect, it, vi } from 'vitest';
import { prisma } from '@costy/db';

import { isEmbeddingConfigured } from '../../lib/ai-gateway.js';
import type * as EmbedModule from '../../lib/search/embed.js';

vi.mock('../../lib/search/embed.js', async (importOriginal) => {
  const actual = await importOriginal<typeof EmbedModule>();
  return {
    ...actual,
    getQueryEmbedding: vi.fn(actual.getQueryEmbedding),
  };
});

const { getQueryEmbedding } = await import('../../lib/search/embed.js');
const { hybridSearch } = await import('./hybrid-search.js');

/** Assert cột generated + GIN/HNSW index hybrid search tồn tại đúng loại. */
async function assertHybridSearchSchema() {
  const [col] = await prisma.$queryRaw<{ exists: boolean; is_generated: string | null }[]>`
    SELECT
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'posts'
          AND column_name = 'search_vector'
      ) AS exists,
      (
        SELECT a.attgenerated::text
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'posts'
          AND a.attname = 'search_vector'
          AND a.attnum > 0
          AND NOT a.attisdropped
      ) AS is_generated
  `;

  expect(col?.exists).toBe(true);
  expect(col?.is_generated).toBe('s');

  const indexes = await prisma.$queryRaw<{ indexname: string; amname: string }[]>`
    SELECT idx.relname AS indexname, am.amname
    FROM pg_index i
    JOIN pg_class idx ON idx.oid = i.indexrelid
    JOIN pg_am am ON am.oid = idx.relam
    WHERE idx.relname IN ('posts_search_vector_idx', 'post_embeddings_embedding_hnsw_idx')
    ORDER BY idx.relname
  `;

  expect(indexes).toEqual([
    { indexname: 'post_embeddings_embedding_hnsw_idx', amname: 'hnsw' },
    { indexname: 'posts_search_vector_idx', amname: 'gin' },
  ]);
}

describe('search smoke', () => {
  const marker = `hybrid-regression-${Date.now()}`;
  let seededPostId: string | null = null;
  let seededAuthorId: string | null = null;

  afterAll(async () => {
    if (seededPostId) {
      await prisma.post.deleteMany({ where: { id: seededPostId } });
    }
    if (seededAuthorId) {
      await prisma.user.deleteMany({ where: { id: seededAuthorId } });
    }
  });

  it('migration applied: hybrid search schema', async () => {
    await assertHybridSearchSchema();
  });

  it('FTS query matches seeded content via search_vector', async () => {
    const author = await prisma.user.create({
      data: {
        email: `${marker}@example.com`,
        username: `u_${Date.now().toString(36)}`,
        name: 'Hybrid Regression',
      },
    });
    seededAuthorId = author.id;

    const post = await prisma.post.create({
      data: {
        authorId: author.id,
        content: `hello ${marker} world`,
      },
    });
    seededPostId = post.id;

    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT p.id
      FROM posts p
      WHERE p.id = ${post.id}
        AND p.search_vector @@ plainto_tsquery('simple', ${marker})
    `;

    expect(rows).toEqual([{ id: post.id }]);
  });

  it('hybridSearch returns valid result shape', async () => {
    const skipOpenAi = process.env.SKIP_EMBEDDING_TESTS === 'true' || !isEmbeddingConfigured();
    vi.mocked(getQueryEmbedding).mockRestore();

    const { results, searchMode } = await hybridSearch(marker, { limit: 5 });

    expect(['hybrid', 'fulltext-only']).toContain(searchMode);
    expect(Array.isArray(results)).toBe(true);

    if (seededPostId) {
      expect(results.some((r) => r.id === seededPostId)).toBe(true);
    }

    if (!skipOpenAi && results.length > 0) {
      const first = results[0]!;
      expect(first).toMatchObject({
        id: expect.any(String),
        content: expect.any(String),
        author: expect.objectContaining({ username: expect.any(String) }),
      });
    }
  });

  it('hybridSearch degrades to fulltext-only when embedding unavailable', async () => {
    vi.mocked(getQueryEmbedding).mockResolvedValueOnce(null);

    const { results, searchMode } = await hybridSearch(marker, { limit: 5 });

    expect(searchMode).toBe('fulltext-only');
    expect(Array.isArray(results)).toBe(true);
    if (seededPostId) {
      expect(results.some((r) => r.id === seededPostId)).toBe(true);
    }
  });
});

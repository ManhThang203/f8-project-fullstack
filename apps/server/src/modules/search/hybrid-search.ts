import { prisma, Prisma } from '@threads/db';
import type { PostSearchResult, SearchMode } from '@threads/shared';

import { getQueryEmbedding } from '../../lib/search/embed.js';
import { mapPostToFeedItemDto, postFeedInclude } from '../posts/posts.mapper.js';

const RRF_K = 60;

type HybridRankRow = {
  id: string;
  score: number;
  from_semantic: boolean;
};

type FulltextRankRow = {
  id: string;
};

/** Load post DTO theo thứ tự id từ kết quả search. */
async function loadSearchResults(ids: string[]): Promise<PostSearchResult[]> {
  if (ids.length === 0) return [];

  const rows = await prisma.post.findMany({
    where: { id: { in: ids }, deletedAt: null, parentId: null },
    include: postFeedInclude,
  });

  const byId = new Map(rows.map((row) => [row.id, row]));
  const results: PostSearchResult[] = [];

  for (const id of ids) {
    const row = byId.get(id);
    if (row) results.push(mapPostToFeedItemDto(row));
  }

  return results;
}

/** FTS thuần — fallback khi không có embedding query hoặc semantic pool rỗng. */
async function searchFulltextOnly(query: string, limit: number): Promise<string[]> {
  const rows = await prisma.$queryRaw<FulltextRankRow[]>(
    Prisma.sql`
      SELECT p.id
      FROM posts p
      WHERE p."parentId" IS NULL
        AND p."deletedAt" IS NULL
        AND p.search_vector @@ plainto_tsquery('simple', ${query})
      ORDER BY ts_rank(p.search_vector, plainto_tsquery('simple', ${query})) DESC
      LIMIT ${limit}
    `,
  );

  return rows.map((row) => row.id);
}

/** Merge FTS + semantic bằng RRF; trả id đã xếp hạng và cờ semantic pool. */
async function searchHybridRrf(
  query: string,
  queryVector: number[],
  pool: number,
  limit: number,
): Promise<{ ids: string[]; hasSemanticHits: boolean }> {
  const vectorLiteral = `[${queryVector.join(',')}]`;

  const rows = await prisma.$queryRaw<HybridRankRow[]>(
    Prisma.sql`
      WITH fulltext AS (
        SELECT p.id,
               ROW_NUMBER() OVER (
                 ORDER BY ts_rank(p.search_vector, plainto_tsquery('simple', ${query})) DESC
               ) AS rn
        FROM posts p
        WHERE p."parentId" IS NULL
          AND p."deletedAt" IS NULL
          AND p.search_vector @@ plainto_tsquery('simple', ${query})
        LIMIT ${pool}
      ),
      semantic AS (
        SELECT sub.id, sub.rn
        FROM (
          SELECT p.id,
                 ROW_NUMBER() OVER (
                   ORDER BY pe.embedding <=> CAST(${vectorLiteral} AS vector)
                 ) AS rn
          FROM posts p
          INNER JOIN post_embeddings pe ON pe."postId" = p.id
          WHERE p."parentId" IS NULL
            AND p."deletedAt" IS NULL
        ) sub
        WHERE sub.rn <= ${pool}
      ),
      combined AS (
        SELECT
          COALESCE(f.id, s.id) AS id,
          COALESCE(1.0 / (${RRF_K} + f.rn), 0) + COALESCE(1.0 / (${RRF_K} + s.rn), 0) AS score,
          (s.id IS NOT NULL) AS from_semantic
        FROM fulltext f
        FULL OUTER JOIN semantic s ON f.id = s.id
      )
      SELECT id, score::float8 AS score, from_semantic
      FROM combined
      ORDER BY score DESC
      LIMIT ${limit}
    `,
  );

  return {
    ids: rows.map((row) => row.id),
    hasSemanticHits: rows.some((row) => row.from_semantic),
  };
}

/** Hybrid search post gốc: FTS + semantic RRF, degrade graceful sang fulltext-only. */
export async function hybridSearch(
  query: string,
  opts: { limit: number },
): Promise<{ results: PostSearchResult[]; searchMode: SearchMode }> {
  const q = query.trim();
  const limit = opts.limit;
  const pool = Math.min(Math.max(limit * 3, 20), 100);

  const queryVector = await getQueryEmbedding(q);

  if (!queryVector) {
    const ids = await searchFulltextOnly(q, limit);
    const results = await loadSearchResults(ids);
    return { results, searchMode: 'fulltext-only' };
  }

  const { ids, hasSemanticHits } = await searchHybridRrf(q, queryVector, pool, limit);

  if (ids.length === 0) {
    const fallbackIds = await searchFulltextOnly(q, limit);
    const results = await loadSearchResults(fallbackIds);
    return { results, searchMode: 'fulltext-only' };
  }

  const results = await loadSearchResults(ids);
  const searchMode: SearchMode = hasSemanticHits ? 'hybrid' : 'fulltext-only';

  return { results, searchMode };
}

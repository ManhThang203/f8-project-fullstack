-- Restore hybrid search indexes removed by migration 20260626015742_sync_schema_with_prisma.
-- search_vector is intentionally DB-only (not in Prisma schema). Do NOT re-run
-- `prisma migrate dev` without reviewing generated SQL — use `prisma migrate deploy`.

ALTER TABLE "posts"
  ADD COLUMN IF NOT EXISTS "search_vector" tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED;

CREATE INDEX IF NOT EXISTS "posts_search_vector_idx" ON "posts" USING GIN ("search_vector");

CREATE INDEX IF NOT EXISTS "post_embeddings_embedding_hnsw_idx"
  ON "post_embeddings"
  USING hnsw ("embedding" vector_cosine_ops);

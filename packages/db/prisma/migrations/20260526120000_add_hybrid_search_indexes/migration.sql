-- Requires: pnpm db:migrate trước khi deploy search API
-- Verify: SELECT COUNT(*) FROM posts WHERE search_vector IS NOT NULL;

-- Full-text search vector (GENERATED column — không khai báo trong Prisma schema)
ALTER TABLE "posts"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED;

CREATE INDEX "posts_search_vector_idx" ON "posts" USING GIN ("search_vector");

-- HNSW index cho semantic search (cosine distance)
CREATE INDEX "post_embeddings_embedding_hnsw_idx"
  ON "post_embeddings"
  USING hnsw ("embedding" vector_cosine_ops);

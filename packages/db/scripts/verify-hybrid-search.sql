-- Assert hybrid search schema after migrate deploy.
-- Exit non-zero via DO block if column/indexes are missing or wrong type.

DO $$
DECLARE
  gen_kind "char";
  gin_am text;
  hnsw_am text;
BEGIN
  SELECT a.attgenerated INTO gen_kind
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'posts'
    AND a.attname = 'search_vector'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF gen_kind IS NULL THEN
    RAISE EXCEPTION 'verify-hybrid-search: posts.search_vector column missing';
  END IF;

  IF gen_kind <> 's' THEN
    RAISE EXCEPTION 'verify-hybrid-search: posts.search_vector must be GENERATED STORED (got %)', gen_kind;
  END IF;

  SELECT am.amname INTO gin_am
  FROM pg_index i
  JOIN pg_class idx ON idx.oid = i.indexrelid
  JOIN pg_am am ON am.oid = idx.relam
  WHERE idx.relname = 'posts_search_vector_idx';

  IF gin_am IS DISTINCT FROM 'gin' THEN
    RAISE EXCEPTION 'verify-hybrid-search: posts_search_vector_idx missing or not GIN (got %)', gin_am;
  END IF;

  SELECT am.amname INTO hnsw_am
  FROM pg_index i
  JOIN pg_class idx ON idx.oid = i.indexrelid
  JOIN pg_am am ON am.oid = idx.relam
  WHERE idx.relname = 'post_embeddings_embedding_hnsw_idx';

  IF hnsw_am IS DISTINCT FROM 'hnsw' THEN
    RAISE EXCEPTION 'verify-hybrid-search: post_embeddings_embedding_hnsw_idx missing or not HNSW (got %)', hnsw_am;
  END IF;
END $$;

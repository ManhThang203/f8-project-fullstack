/*
  Warnings:

  - You are about to drop the column `search_vector` on the `posts` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "post_embeddings_embedding_hnsw_idx";

-- DropIndex
DROP INDEX "posts_search_vector_idx";

-- AlterTable
ALTER TABLE "posts" DROP COLUMN "search_vector";

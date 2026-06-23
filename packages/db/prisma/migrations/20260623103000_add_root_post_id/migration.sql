-- Add rootPostId for denormalized comment thread root tracking.
-- This allows efficient total comment count (all levels) per root post.
-- Nullable so existing data remains valid until backfilled.

ALTER TABLE "posts" ADD COLUMN "rootPostId" TEXT;

CREATE INDEX "posts_rootPostId_idx" ON "posts"("rootPostId");

-- Note: after deploy, run backfill script to populate rootPostId for existing comments.
-- Example: pnpm --filter @costy/db exec tsx prisma/backfill-root-post-ids.ts

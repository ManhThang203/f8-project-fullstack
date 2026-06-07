-- DropForeignKey
ALTER TABLE "appeals" DROP CONSTRAINT IF EXISTS "appeals_authorId_fkey";
ALTER TABLE "appeals" DROP CONSTRAINT IF EXISTS "appeals_caseId_fkey";
ALTER TABLE "moderation_cases" DROP CONSTRAINT IF EXISTS "moderation_cases_closedById_fkey";
ALTER TABLE "moderation_cases" DROP CONSTRAINT IF EXISTS "moderation_cases_authorId_fkey";

-- DropTable
DROP TABLE IF EXISTS "appeals";
DROP TABLE IF EXISTS "moderation_cases";

-- AlterTable
ALTER TABLE "posts" DROP COLUMN IF EXISTS "moderationReviewedAt";

-- DropEnum
DROP TYPE IF EXISTS "AppealStatus";
DROP TYPE IF EXISTS "ModerationTrigger";
DROP TYPE IF EXISTS "ModerationCaseStatus";

-- AlterTable (PostgreSQL — idempotent nếu cột đã có sẵn từ lần chạy trước)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "showActivityStatus" BOOLEAN NOT NULL DEFAULT true;

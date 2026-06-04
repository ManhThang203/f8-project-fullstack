-- upgrade_report_enums_and_indexes
-- Nâng cấp ReportReason, ReportStatus, thêm REPORT_RESOLVED notification,
-- thêm unique constraint và indexes mới cho hệ thống báo cáo Facebook-style.

-- 1. Dọn enum _new cũ nếu còn sót từ migration fail
DROP TYPE IF EXISTS "ReportReason_new";
DROP TYPE IF EXISTS "ReportStatus_new";

-- 2. Tạo enum mới ReportReason với tất cả giá trị cần thiết
CREATE TYPE "ReportReason_new" AS ENUM (
  'SPAM',
  'BULLYING',
  'MINOR_SAFETY',
  'SELF_HARM',
  'VIOLENCE',
  'RESTRICTED_GOODS',
  'ADULT_CONTENT',
  'MISINFORMATION',
  'IP_VIOLATION',
  'NOT_INTERESTED'
);

-- 3. Đổi cột reports.reason sang enum mới
ALTER TABLE "reports" ALTER COLUMN "reason" DROP DEFAULT;
ALTER TABLE "reports"
  ALTER COLUMN "reason" TYPE "ReportReason_new"
  USING "reason"::text::"ReportReason_new";

-- 4. Drop enum cũ và rename enum mới
DROP TYPE "ReportReason";
ALTER TYPE "ReportReason_new" RENAME TO "ReportReason";

-- 5. Tạo enum mới ReportStatus
CREATE TYPE "ReportStatus_new" AS ENUM (
  'PENDING',
  'UNDER_REVIEW',
  'RESOLVED',
  'DISMISSED',
  'AUTO_HIDDEN'
);

-- 6. Đổi cột reports.status sang enum mới
ALTER TABLE "reports" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "reports"
  ALTER COLUMN "status" TYPE "ReportStatus_new"
  USING "status"::text::"ReportStatus_new";
-- Restore default
ALTER TABLE "reports" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- 7. Drop enum cũ và rename
DROP TYPE "ReportStatus";
ALTER TYPE "ReportStatus_new" RENAME TO "ReportStatus";

-- 8. Thêm REPORT_RESOLVED vào NotificationType enum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REPORT_RESOLVED';

-- 9. Unique constraint: mỗi user chỉ báo cáo cùng target 1 lần
ALTER TABLE "reports"
  ADD CONSTRAINT "reports_reporterId_targetType_targetId_key"
  UNIQUE ("reporterId", "targetType", "targetId");

-- 10. Index cho anti-abuse (đếm dismissed reports theo ngày của reporter)
CREATE INDEX IF NOT EXISTS "reports_reporterId_status_createdAt_idx"
  ON "reports" ("reporterId", "status", "createdAt");

-- 11. Index cho audit log: lọc theo target (xem lịch sử xử lý)
CREATE INDEX IF NOT EXISTS "admin_audit_logs_targetType_targetId_createdAt_idx"
  ON "admin_audit_logs" ("targetType", "targetId", "createdAt" DESC);

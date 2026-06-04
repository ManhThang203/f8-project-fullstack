/**
 * Cấu hình hệ thống báo cáo — đọc từ env var với giá trị mặc định hợp lý.
 * Thay đổi threshold không cần deploy lại code, chỉ cần restart server.
 *
 * Ví dụ .env khi dev (để test nhanh):
 *   REPORT_AUTO_HIDE_THRESHOLD=2
 *   REPORT_ANTI_ABUSE_DAILY_LIMIT=5
 *   REPORT_AUTO_ESCALATE_THRESHOLD=3
 */
export const REPORT_CONFIG = {
  /** Số reports MINOR_SAFETY trên cùng 1 target để auto-hide bài. */
  autoHideThreshold: parseInt(process.env.REPORT_AUTO_HIDE_THRESHOLD ?? '10', 10),

  /** Số reports bị DISMISSED trong ngày để gắn flag anti-abuse cho reporter. */
  antiAbuseDailyLimit: parseInt(process.env.REPORT_ANTI_ABUSE_DAILY_LIMIT ?? '20', 10),

  /** Số reports trên cùng 1 target để đánh dấu priority cao trong queue. */
  autoEscalateThreshold: parseInt(process.env.REPORT_AUTO_ESCALATE_THRESHOLD ?? '5', 10),
} as const;

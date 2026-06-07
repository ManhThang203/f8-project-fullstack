export type ReportStatus = 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED' | 'AUTO_HIDDEN';

/** Bộ lọc tab trạng thái — OPEN = hàng đợi chờ admin xử lý. */
export type ReportStatusFilter = 'OPEN' | Exclude<ReportStatus, 'AUTO_HIDDEN' | 'PENDING'>;
export type ReportReason =
  | 'SPAM'
  | 'BULLYING'
  | 'MINOR_SAFETY'
  | 'SELF_HARM'
  | 'VIOLENCE'
  | 'RESTRICTED_GOODS'
  | 'ADULT_CONTENT'
  | 'MISINFORMATION'
  | 'IP_VIOLATION'
  | 'NOT_INTERESTED';
export type TargetType = 'POST' | 'USER' | 'COMMENT';

export const ALL_STATUSES: ReportStatusFilter[] = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'];

/** Key i18n cho nhãn tab lọc trạng thái (OPEN chỉ là giá trị nội bộ, không hiển thị ra UI). */
export const STATUS_FILTER_I18N_KEYS: Record<ReportStatusFilter, string> = {
  OPEN: 'reports.statusFilter.open',
  UNDER_REVIEW: 'reports.statusFilter.underReview',
  RESOLVED: 'reports.statusFilter.resolved',
  DISMISSED: 'reports.statusFilter.dismissed',
};

/** Báo cáo còn cần admin xử lý (kể cả AUTO_HIDDEN cũ từ auto-hide đã gỡ). */
export function isActionableReportStatus(status: string): boolean {
  return status === 'PENDING' || status === 'UNDER_REVIEW' || status === 'AUTO_HIDDEN';
}

export const ALL_REASONS: ReportReason[] = [
  'SPAM',
  'BULLYING',
  'MINOR_SAFETY',
  'SELF_HARM',
  'VIOLENCE',
  'RESTRICTED_GOODS',
  'ADULT_CONTENT',
  'MISINFORMATION',
  'IP_VIOLATION',
  'NOT_INTERESTED',
];

export const ALL_TARGETS: TargetType[] = ['POST', 'USER', 'COMMENT'];

export const STATUS_COLORS: Record<ReportStatus, string> = {
  PENDING: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  UNDER_REVIEW: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  RESOLVED: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30',
  DISMISSED: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
  AUTO_HIDDEN: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
};

export const REASON_COLORS: Record<ReportReason, string> = {
  SPAM: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
  BULLYING: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  MINOR_SAFETY: 'bg-red-500/15 text-red-700 dark:text-red-400',
  SELF_HARM: 'bg-red-500/15 text-red-700 dark:text-red-400',
  VIOLENCE: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  RESTRICTED_GOODS: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  ADULT_CONTENT: 'bg-pink-500/15 text-pink-700 dark:text-pink-400',
  MISINFORMATION: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400',
  IP_VIOLATION: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
  NOT_INTERESTED: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
};

/** Ngưỡng số báo cáo để đánh dấu ưu tiên cao — khớp REPORT_AUTO_ESCALATE_THRESHOLD. */
export const REPORT_ESCALATE_THRESHOLD = 2;

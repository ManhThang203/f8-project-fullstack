/** Format ISO date theo locale hiển thị (en-US / vi-VN). */
export function formatReportDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN');
}

export type ReportActionType =
  | 'DISMISS'
  | 'HIDE_POST'
  | 'DELETE_POST'
  | 'WARN_USER'
  | 'BAN_ACCOUNT';

export const REPORT_ACTION_COLORS: Record<ReportActionType, string> = {
  DISMISS: 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100',
  HIDE_POST: 'bg-yellow-600 hover:bg-yellow-500 text-white',
  DELETE_POST: 'bg-red-600 hover:bg-red-500 text-white',
  WARN_USER: 'bg-orange-600 hover:bg-orange-500 text-white',
  BAN_ACCOUNT: 'bg-red-900 hover:bg-red-800 text-white',
};

export const REPORT_POST_ACTIONS: ReportActionType[] = [
  'DISMISS',
  'HIDE_POST',
  'DELETE_POST',
  'WARN_USER',
  'BAN_ACCOUNT',
];

export const REPORT_USER_ACTIONS: ReportActionType[] = ['DISMISS', 'WARN_USER', 'BAN_ACCOUNT'];

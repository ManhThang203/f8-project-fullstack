import type { ModerationCaseStatus, ModerationTrigger } from '@costy/shared';

export const ALL_CASE_STATUSES: ModerationCaseStatus[] = [
  'OPEN',
  'UNDER_REVIEW',
  'UPHELD',
  'RESTORED',
  'EXPIRED',
];

export const CASE_STATUS_COLORS: Record<ModerationCaseStatus, string> = {
  OPEN: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  UNDER_REVIEW: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  UPHELD: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
  RESTORED: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30',
  EXPIRED: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
};

export const TRIGGER_COLORS: Record<ModerationTrigger, string> = {
  AUTO_HIDE_MINOR_SAFETY: 'bg-red-500/15 text-red-700 dark:text-red-400',
  ADMIN_HIDE: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
};

export const CASE_ESCALATE_THRESHOLD = 2;

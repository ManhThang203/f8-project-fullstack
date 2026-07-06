'use client';

import { useTranslation } from 'react-i18next';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  UNDER_REVIEW: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  RESOLVED: 'bg-green-500/15 text-green-700 dark:text-green-400',
  DISMISSED: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
  AUTO_HIDDEN: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  ACTIVE: 'bg-green-500/15 text-green-700 dark:text-green-400',
  LOCKED: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  BANNED: 'bg-red-500/15 text-red-700 dark:text-red-400',
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground'}`}
    >
      {t(`reportStatus.${status}`, t(`status.${status}`, status))}
    </span>
  );
}

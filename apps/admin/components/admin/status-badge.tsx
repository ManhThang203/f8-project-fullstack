'use client';

import type { UserStatus } from '@costy/shared';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

const styles: Record<UserStatus, string> = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  LOCKED: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  BANNED: 'bg-red-500/15 text-red-400 border-red-500/30',
};

type Props = {
  status: UserStatus;
  className?: string;
};

export function StatusBadge({ status, className }: Props) {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        'inline-flex min-h-6 items-center rounded-md border px-2 text-xs font-medium',
        styles[status],
        className,
      )}
    >
      {t(`status.${status}`)}
    </span>
  );
}

'use client';

import { Fragment, type ReactNode } from 'react';

import { formatCount } from '@/lib/format-count';
import { cn } from '@/lib/utils';

type Props = {
  icon: ReactNode;
  count?: number;
  label: string;
  onClick?: () => void;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
  onPointerLeave?: () => void;
  className?: string;
};

export function ActionButton({
  icon,
  count,
  label,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  className,
}: Props) {
  const showCount = count !== undefined && count > 0;

  const content = (
    <Fragment>
      <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
        {icon}
      </span>
      {showCount && <span className="text-sm tabular-nums">{formatCount(count)}</span>}
    </Fragment>
  );

  const styles = cn(
    'text-muted-foreground dark:text-gray-400',
    'flex min-h-11 items-center gap-1.5 rounded-md px-2 py-1',
    'transition-colors duration-150',
    'hover:bg-white/5',
    'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
    className,
  );

  if (onClick) {
    return (
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        className={styles}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={styles} aria-label={label}>
      {content}
    </span>
  );
}

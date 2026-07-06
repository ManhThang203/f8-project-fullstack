'use client';

import { useEffect, useState } from 'react';

import {
  formatAbsoluteTime,
  formatPostRelativeTime,
  formatRelativeTime,
  getRelativeTimeTickMs,
} from '@/lib/format-relative-time';
import { cn } from '@/lib/utils';

type Props = {
  dateTime: string;
  variant?: 'post' | 'default';
  className?: string;
};

/** Hiển thị thời gian tương đối, tự cập nhật theo tick phù hợp tuổi timestamp. */
export function RelativeTime({ dateTime, variant = 'default', className }: Props) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const tickMs = getRelativeTimeTickMs(dateTime);
    if (tickMs === null) return;

    const id = setInterval(() => setTick((n) => n + 1), tickMs);
    return () => clearInterval(id);
  }, [dateTime]);

  const label =
    variant === 'post' ? formatPostRelativeTime(dateTime) : formatRelativeTime(dateTime);

  return (
    <time dateTime={dateTime} title={formatAbsoluteTime(dateTime)} className={cn(className)}>
      {label}
    </time>
  );
}

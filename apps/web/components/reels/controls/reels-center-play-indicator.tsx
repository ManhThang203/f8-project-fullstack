'use client';

import { Play } from 'lucide-react';

import { cn } from '@/lib/utils';

type Props = {
  className?: string;
};

/** Icon play giữa màn hình khi video pause trên mobile — chỉ hiển thị, tap xử lý qua video. */
export function ReelsCenterPlayIndicator({ className }: Props) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-10 flex items-center justify-center',
        className,
      )}
      aria-hidden
    >
      <div className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm">
        <Play className="h-10 w-10 fill-white pl-1" aria-hidden />
      </div>
    </div>
  );
}

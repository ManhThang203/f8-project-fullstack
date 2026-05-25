'use client';

import { useRef, useState } from 'react';

import { cn } from '@/lib/utils';

type Props = {
  currentTimeMs: number;
  durationMs: number;
  onSeek: (timeMs: number) => void;
  className?: string;
  visible?: boolean;
};

export function ReelsProgressBar({
  currentTimeMs,
  durationMs,
  onSeek,
  className,
  visible = true,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  const progress = durationMs > 0 ? currentTimeMs / durationMs : 0;

  function getTimeFromClientX(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || durationMs <= 0) return 0;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * durationMs;
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    onSeek(getTimeFromClientX(e.clientX));
  }

  return (
    <div
      className={cn(
        'absolute bottom-0 left-0 right-0 z-30 px-0 transition-[opacity,visibility] duration-150 motion-reduce:transition-none',
        !visible && 'pointer-events-none invisible opacity-0',
        className,
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={handleClick}
    >
      <div className="relative flex h-5 cursor-pointer items-center">
        <div
          ref={trackRef}
          className={cn(
            'relative w-full bg-white/30 transition-[height] duration-150',
            isHovering ? 'h-1' : 'h-0.5',
          )}
        >
          <div
            className="h-full bg-white transition-[width] duration-100"
            style={{ width: `${progress * 100}%` }}
          />
          <div
            className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
            style={{ left: `${progress * 100}%` }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}

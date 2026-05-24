'use client';

import { useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { ReelsPreviewTooltip } from './reels-preview-tooltip';

type Props = {
  currentTimeMs: number;
  durationMs: number;
  src: string;
  onSeek: (timeMs: number) => void;
  className?: string;
};

export function ReelsProgressBar({
  currentTimeMs,
  durationMs,
  src,
  onSeek,
  className,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverX, setHoverX] = useState(0);
  const [hoverTimeMs, setHoverTimeMs] = useState(0);

  const progress = durationMs > 0 ? currentTimeMs / durationMs : 0;

  function getTimeFromClientX(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || durationMs <= 0) return 0;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * durationMs;
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    setHoverX(e.clientX - rect.left);
    setHoverTimeMs(getTimeFromClientX(e.clientX));
    void x;
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    onSeek(getTimeFromClientX(e.clientX));
  }

  const trackWidth = trackRef.current?.getBoundingClientRect().width ?? 0;

  return (
    <div
      className={cn('absolute bottom-0 left-0 right-0 z-30 px-0', className)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      {/* Tooltip on hover */}
      {isHovering && durationMs > 0 && (
        <ReelsPreviewTooltip
          src={src}
          hoverTimeMs={hoverTimeMs}
          left={hoverX}
          trackWidth={trackWidth}
        />
      )}

      {/* Hit area — tall for easier interaction, visually shows thin bar */}
      <div className="relative flex cursor-pointer items-end" style={{ height: 20 }}>
        <div
          ref={trackRef}
          className={cn(
            'relative w-full overflow-hidden bg-white/30',
            'transition-[height] duration-150',
            isHovering ? 'h-1' : 'h-0.5',
          )}
        >
          {/* Filled portion */}
          <div
            className="h-full bg-white transition-[width] duration-100"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Thumb — only visible on hover */}
        {isHovering && (
          <div
            className="pointer-events-none absolute bottom-0 h-3 w-3 -translate-x-1/2 -translate-y-0 rounded-full bg-white shadow"
            style={{ left: `${progress * 100}%`, bottom: 0 }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}

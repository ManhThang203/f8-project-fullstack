'use client';

import { Pause, Play } from 'lucide-react';
import { useRef, useState } from 'react';

import { formatDuration } from '@/components/reels/reels-utils';
import { cn } from '@/lib/utils';

import { FeedVideoVolumeControl } from './feed-video-volume-control';

type ProgressTrackProps = {
  currentTimeMs: number;
  durationMs: number;
  onSeek: (timeMs: number) => void;
};

/** Thanh progress inline trong bottom bar, click để tua. */
function FeedVideoProgressTrack({ currentTimeMs, durationMs, onSeek }: ProgressTrackProps) {
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
      className="relative flex min-w-0 flex-1 cursor-pointer items-center py-2"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={handleClick}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        ref={trackRef}
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-white/30',
          'transition-[height] duration-150',
          isHovering ? 'h-1' : 'h-0.5',
        )}
      >
        <div
          className="h-full bg-white transition-[width] duration-100"
          style={{ width: `${progress * 100}%` }}
        />
        {isHovering && (
          <div
            className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
            style={{ left: `${progress * 100}%` }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}

type Props = {
  isPlaying: boolean;
  currentTimeMs: number;
  durationMs: number;
  volume: number;
  muted: boolean;
  onTogglePlay: (e: React.MouseEvent) => void;
  onToggleMute: (e: React.MouseEvent) => void;
  onVolumeChange: (volume: number) => void;
  onSeek: (timeMs: number) => void;
};

const iconBtn =
  'flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60';

/** Bottom bar kiểu Facebook: Play | time | progress | volume. */
export function FeedVideoControlBar({
  isPlaying,
  currentTimeMs,
  durationMs,
  volume,
  muted,
  onTogglePlay,
  onToggleMute,
  onVolumeChange,
  onSeek,
}: Props) {
  return (
    <div
      className="feed-video-controls absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
          className={iconBtn}
          onClick={onTogglePlay}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" aria-hidden />
          ) : (
            <Play className="h-5 w-5 fill-white" aria-hidden />
          )}
        </button>

        <span className="shrink-0 text-xs tabular-nums text-white">
          {formatDuration(currentTimeMs)} / {formatDuration(durationMs)}
        </span>

        <FeedVideoProgressTrack
          currentTimeMs={currentTimeMs}
          durationMs={durationMs}
          onSeek={onSeek}
        />

        <FeedVideoVolumeControl
          volume={volume}
          muted={muted}
          onVolumeChange={onVolumeChange}
          onToggleMute={onToggleMute}
        />
      </div>
    </div>
  );
}

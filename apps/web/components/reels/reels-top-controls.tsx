'use client';

import { Pause, Play, Search } from 'lucide-react';

import { cn } from '@/lib/utils';

import { ReelsVolumeControl } from './reels-volume-control';

type Props = {
  isPlaying: boolean;
  volume: number;
  muted: boolean;
  onTogglePlay: (e: React.MouseEvent) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: (e: React.MouseEvent) => void;
  onSearch: (e: React.MouseEvent) => void;
  className?: string;
};

const glassBtn =
  'flex min-h-11 min-w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors duration-150 hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60';

export function ReelsTopControls({
  isPlaying,
  volume,
  muted,
  onTogglePlay,
  onVolumeChange,
  onToggleMute,
  onSearch,
  className,
}: Props) {
  return (
    <>
      <div
        className={cn(
          'absolute left-0 top-0 z-20 flex items-center gap-2 p-3',
          className,
        )}
      >
        <button
          type="button"
          aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
          className={glassBtn}
          onClick={onTogglePlay}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" aria-hidden />
          ) : (
            <Play className="h-5 w-5" aria-hidden />
          )}
        </button>

        <ReelsVolumeControl
          volume={volume}
          muted={muted}
          onVolumeChange={onVolumeChange}
          onToggleMute={onToggleMute}
        />
      </div>

      <button
        type="button"
        aria-label="Tìm kiếm"
        className={cn(glassBtn, 'absolute right-3 top-3 z-20', className)}
        onClick={onSearch}
      >
        <Search className="h-5 w-5" aria-hidden />
      </button>
    </>
  );
}

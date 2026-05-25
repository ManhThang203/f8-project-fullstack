'use client';

import { Pause, Play, Search } from 'lucide-react';

import { cn } from '@/lib/utils';

import {
  ReelsVolumeControl,
  type ReelsVolumeVariant,
} from '@/components/reels/controls/reels-volume-control';

type Props = {
  isPlaying: boolean;
  volume: number;
  muted: boolean;
  showPlayButton?: boolean;
  volumeVariant?: ReelsVolumeVariant;
  volumeSliderOpen?: boolean;
  onVolumeSliderOpenChange?: (open: boolean) => void;
  visible?: boolean;
  onTogglePlay: (e: React.MouseEvent) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: (e: React.MouseEvent) => void;
  onVolumeIconTap?: (e: React.MouseEvent) => void;
  onSearch: (e: React.MouseEvent) => void;
  className?: string;
};

const glassBtn =
  'flex min-h-11 min-w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors duration-150 hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60';

const visibilityClass =
  'transition-[opacity,visibility] duration-150 motion-reduce:transition-none';

export function ReelsTopControls({
  isPlaying,
  volume,
  muted,
  showPlayButton = true,
  volumeVariant = 'hover-slider',
  volumeSliderOpen = false,
  onVolumeSliderOpenChange,
  visible = true,
  onTogglePlay,
  onVolumeChange,
  onToggleMute,
  onVolumeIconTap,
  onSearch,
  className,
}: Props) {
  const hidden = !visible;

  return (
    <>
      <div
        className={cn(
          'absolute left-0 top-0 z-20 flex items-center gap-2 p-3',
          visibilityClass,
          hidden && 'pointer-events-none invisible opacity-0',
          className,
        )}
      >
        {showPlayButton ? (
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
        ) : null}

        <ReelsVolumeControl
          volume={volume}
          muted={muted}
          variant={volumeVariant}
          isOpen={volumeSliderOpen}
          onOpenChange={onVolumeSliderOpenChange}
          onVolumeChange={onVolumeChange}
          onToggleMute={onToggleMute}
          onVolumeIconTap={onVolumeIconTap}
        />
      </div>

      <button
        type="button"
        aria-label="Tìm kiếm"
        className={cn(
          glassBtn,
          'absolute right-3 top-3 z-20',
          visibilityClass,
          hidden && 'pointer-events-none invisible opacity-0',
          className,
        )}
        onClick={onSearch}
      >
        <Search className="h-5 w-5" aria-hidden />
      </button>
    </>
  );
}

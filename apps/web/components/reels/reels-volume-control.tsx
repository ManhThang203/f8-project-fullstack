'use client';

import { Volume2, VolumeX } from 'lucide-react';

import { cn } from '@/lib/utils';

type Props = {
  volume: number;
  muted: boolean;
  onVolumeChange: (volume: number) => void;
  onToggleMute: (e: React.MouseEvent) => void;
};

const pillShell =
  'flex min-h-11 items-center rounded-full bg-black/40 text-white backdrop-blur-sm';

const iconBtn =
  'flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60';

const sliderReveal =
  'reels-volume-slider-wrap grid w-0 grid-cols-1 opacity-0 transition-[width,opacity,padding] duration-150 group-hover/volume:w-[8.5rem] group-hover/volume:opacity-100 group-hover/volume:pl-1 group-hover/volume:pr-2 group-focus-within/volume:w-[8.5rem] group-focus-within/volume:opacity-100 group-focus-within/volume:pl-1 group-focus-within/volume:pr-2';

export function ReelsVolumeControl({
  volume,
  muted,
  onVolumeChange,
  onToggleMute,
}: Props) {
  const isSilent = muted || volume === 0;
  const sliderValue = muted ? 0 : Math.round(volume * 100);

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.stopPropagation();
    onVolumeChange(Number(e.target.value) / 100);
  }

  return (
    <div className="group/volume relative flex items-center">
      <div className={cn(pillShell, 'group-hover/volume:pr-4 group-focus-within/volume:pr-4')}>
        <button
          type="button"
          aria-label={isSilent ? 'Bật tiếng' : 'Tắt tiếng'}
          className={iconBtn}
          onClick={onToggleMute}
        >
          {isSilent ? (
            <VolumeX className="h-5 w-5" aria-hidden />
          ) : (
            <Volume2 className="h-5 w-5" aria-hidden />
          )}
        </button>

        <div className={sliderReveal}>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={sliderValue}
            aria-label="Âm lượng"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={sliderValue}
            className="reels-volume-slider w-full min-w-[6.5rem] cursor-pointer"
            style={{ ['--reels-volume-pct' as string]: `${sliderValue}%` }}
            onChange={handleSliderChange}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    </div>
  );
}

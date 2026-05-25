'use client';

import { useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

import { cn } from '@/lib/utils';

export type ReelsVolumeVariant = 'hover-slider' | 'tap-slider' | 'toggle-only';

type Props = {
  volume: number;
  muted: boolean;
  variant?: ReelsVolumeVariant;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: (e: React.MouseEvent) => void;
  onVolumeIconTap?: (e: React.MouseEvent) => void;
};

const pillShell =
  'flex min-h-11 items-center rounded-full bg-black/40 text-white backdrop-blur-sm';

const iconBtn =
  'flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60';

const hoverSliderReveal =
  'reels-volume-slider-wrap grid w-0 grid-cols-1 opacity-0 transition-[width,opacity,padding] duration-150 group-hover/volume:w-[8.5rem] group-hover/volume:opacity-100 group-hover/volume:pl-1 group-hover/volume:pr-2 group-focus-within/volume:w-[8.5rem] group-focus-within/volume:opacity-100 group-focus-within/volume:pl-1 group-focus-within/volume:pr-2';

export function ReelsVolumeControl({
  volume,
  muted,
  variant = 'hover-slider',
  isOpen = false,
  onOpenChange,
  onVolumeChange,
  onToggleMute,
  onVolumeIconTap,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const isSilent = muted || volume === 0;
  const sliderValue = muted ? 0 : Math.round(volume * 100);

  useEffect(() => {
    if (variant !== 'tap-slider' || !isOpen) return;

    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      onOpenChange?.(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [variant, isOpen, onOpenChange]);

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.stopPropagation();
    onVolumeChange(Number(e.target.value) / 100);
  }

  function handleIconClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (variant === 'tap-slider') {
      onVolumeIconTap?.(e);
      return;
    }
    onToggleMute(e);
  }

  if (variant === 'toggle-only') {
    return (
      <div ref={rootRef} className="relative flex items-center">
        <div className={pillShell}>
          <button
            type="button"
            aria-label={isSilent ? 'Bật tiếng' : 'Tắt tiếng'}
            className={iconBtn}
            onClick={handleIconClick}
          >
            {isSilent ? (
              <VolumeX className="h-5 w-5" aria-hidden />
            ) : (
              <Volume2 className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
      </div>
    );
  }

  const sliderWrapClass =
    variant === 'tap-slider'
      ? cn(
          'reels-volume-slider-wrap grid grid-cols-1 transition-[width,opacity,padding] duration-150',
          isOpen
            ? 'reels-volume-slider-wrap--open w-[8.5rem] pl-1 pr-2 opacity-100'
            : 'w-0 opacity-0',
        )
      : hoverSliderReveal;

  return (
    <div ref={rootRef} className="group/volume relative flex items-center">
      <div
        className={cn(
          pillShell,
          variant === 'hover-slider' && 'group-hover/volume:pr-4 group-focus-within/volume:pr-4',
          variant === 'tap-slider' && isOpen && 'pr-4',
        )}
      >
        <button
          type="button"
          aria-label={isSilent ? 'Bật tiếng' : 'Tắt tiếng'}
          aria-expanded={variant === 'tap-slider' ? isOpen : undefined}
          className={iconBtn}
          onClick={handleIconClick}
        >
          {isSilent ? (
            <VolumeX className="h-5 w-5" aria-hidden />
          ) : (
            <Volume2 className="h-5 w-5" aria-hidden />
          )}
        </button>

        <div className={sliderWrapClass}>
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

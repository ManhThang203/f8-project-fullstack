'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

import { cn } from '@/lib/utils';

type Props = {
  volume: number;
  muted: boolean;
  onVolumeChange: (volume: number) => void;
  onToggleMute: (e: React.MouseEvent) => void;
};

const iconBtn =
  'flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60';

const SLIDER_CLOSE_DELAY_MS = 150;

/** Volume feed: icon + slider dọc popover phía trên; hover/touch mở slider, pb-2 lấp gap. */
export function FeedVideoVolumeControl({
  volume,
  muted,
  onVolumeChange,
  onToggleMute,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const canHoverRef = useRef(true);

  const [sliderOpen, setSliderOpen] = useState(false);
  const [focusedWithin, setFocusedWithin] = useState(false);

  const isSilent = muted || volume === 0;
  const sliderValue = muted ? 0 : Math.round(volume * 100);
  const sliderVisible = sliderOpen || focusedWithin;

  useEffect(() => {
    canHoverRef.current = window.matchMedia('(hover: hover)').matches;
  }, []);

  useEffect(() => {
    if (!sliderOpen || canHoverRef.current) return;

    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      setSliderOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [sliderOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  /** Mở slider ngay, hủy timer đóng nếu có. */
  function openSlider() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setSliderOpen(true);
  }

  /** Đóng slider sau delay ngắn để chuột di qua vùng cầu nối. */
  function scheduleClose() {
    closeTimerRef.current = setTimeout(() => setSliderOpen(false), SLIDER_CLOSE_DELAY_MS);
  }

  function handleFocusCapture() {
    setFocusedWithin(true);
    openSlider();
  }

  function handleBlurCapture(e: React.FocusEvent<HTMLDivElement>) {
    const next = e.relatedTarget;
    if (next instanceof Node && rootRef.current?.contains(next)) return;
    setFocusedWithin(false);
    scheduleClose();
  }

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.stopPropagation();
    onVolumeChange(Number(e.target.value) / 100);
  }

  function handleIconClick(e: React.MouseEvent) {
    if (canHoverRef.current) {
      onToggleMute(e);
      return;
    }
    e.stopPropagation();
    setSliderOpen((prev) => !prev);
  }

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      onMouseEnter={openSlider}
      onMouseLeave={scheduleClose}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
    >
      <div
        className={cn(
          'absolute bottom-full left-1/2 -translate-x-1/2 pb-2 transition-opacity duration-150',
          sliderVisible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        aria-hidden={!sliderVisible}
      >
        <div className="flex h-20 w-11 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
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
            aria-orientation="vertical"
            tabIndex={sliderVisible ? 0 : -1}
            className="feed-volume-slider"
            style={{ ['--feed-volume-pct' as string]: `${sliderValue}%` }}
            onChange={handleSliderChange}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
      </div>

      <button
        type="button"
        aria-label={isSilent ? 'Bật tiếng' : 'Tắt tiếng'}
        aria-expanded={canHoverRef.current ? undefined : sliderOpen}
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
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';

import { useDebounced } from '@/hooks/use-debounced';
import { formatDuration } from './reels-utils';

type Props = {
  src: string;
  hoverTimeMs: number;
  /** Left position in px relative to the progress bar track. */
  left: number;
  /** Full width of the progress bar track (for clamping). */
  trackWidth: number;
};

const TOOLTIP_W = 120; // px

export function ReelsPreviewTooltip({ src, hoverTimeMs, left, trackWidth }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  const debouncedTime = useDebounced(hoverTimeMs / 1000, 80);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = debouncedTime;
  }, [debouncedTime]);

  function onSeeked() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setDataUrl(canvas.toDataURL());
    } catch {
      // CORS or other error — just show the timestamp without frame
      setDataUrl(null);
    }
  }

  // Clamp so tooltip stays within track bounds
  const clampedLeft = Math.max(
    TOOLTIP_W / 2,
    Math.min(left, trackWidth - TOOLTIP_W / 2),
  );

  return (
    <>
      {/* Hidden video for frame seeking */}
      <video
        ref={videoRef}
        src={src}
        className="hidden"
        preload="metadata"
        muted
        playsInline
        onSeeked={onSeeked}
      />
      {/* Hidden canvas for drawing */}
      <canvas ref={canvasRef} width={120} height={68} className="hidden" />

      {/* Floating tooltip */}
      <div
        className="pointer-events-none absolute bottom-full mb-2 flex flex-col items-center overflow-hidden rounded-lg bg-black/80 shadow-lg"
        style={{
          left: clampedLeft,
          transform: 'translateX(-50%)',
          width: TOOLTIP_W,
        }}
        aria-hidden
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt=""
            className="h-[68px] w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="bg-muted h-[68px] w-full" />
        )}
        <span className="w-full py-1 text-center text-xs font-medium text-white">
          {formatDuration(hoverTimeMs)}
        </span>
      </div>
    </>
  );
}

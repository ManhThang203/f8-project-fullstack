'use client';

import { useRef } from 'react';

import type { VideoSize } from '../reels-types';

import { cn } from '@/lib/utils';

export type { VideoSize } from '../reels-types';

type Props = {
  src: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onVideoTap: () => void;
  onVideoSizeChange: (size: VideoSize) => void;
  className?: string;
  objectFit?: 'contain' | 'cover';
  preload?: 'none' | 'metadata' | 'auto';
};

/** Ngưỡng di chuyển (px) để coi là scroll, không phải tap. */
const SCROLL_MOVE_THRESHOLD_PX = 10;

/** Surface video Reels — tap play/pause, bỏ qua click sau khi vuốt. */
export function ReelsVideoSurface({
  src,
  videoRef,
  onVideoTap,
  onVideoSizeChange,
  className,
  objectFit = 'contain',
  preload = 'metadata',
}: Props) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchMovedRef = useRef(false);
  const skipNextClickRef = useRef(false);

  /** Đọc kích thước tự nhiên của video khi metadata sẵn sàng. */
  function handleLoadedMetadata(e: React.SyntheticEvent<HTMLVideoElement>) {
    const video = e.currentTarget;
    if (video.videoWidth <= 0 || video.videoHeight <= 0) return;
    onVideoSizeChange({ width: video.videoWidth, height: video.videoHeight });
  }
   // Xử lý tap video.
  function handleTouchStart(e: React.TouchEvent<HTMLVideoElement>) {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchMovedRef.current = false;
  }

  /** Đánh dấu gesture là scroll khi ngón tay di chuyển quá ngưỡng. */
  function handleTouchMove(e: React.TouchEvent<HTMLVideoElement>) {
    const start = touchStartRef.current;
    const touch = e.touches[0];
    if (!start || !touch) return;
    const dx = Math.abs(touch.clientX - start.x);
    const dy = Math.abs(touch.clientY - start.y);
    if (dx > SCROLL_MOVE_THRESHOLD_PX || dy > SCROLL_MOVE_THRESHOLD_PX) {
      touchMovedRef.current = true;
    }
  }

  /** Sau vuốt: chặn đúng 1 click synthetic, không ảnh hưởng click chuột sau đó. */
  function handleTouchEnd() {
    if (touchMovedRef.current) {
      skipNextClickRef.current = true;
      touchMovedRef.current = false;
    }
    touchStartRef.current = null;
  }

  /** Tap video → play/pause; bỏ qua click phát sinh sau scroll. */
  function handleClick() {
    if (skipNextClickRef.current) {
      skipNextClickRef.current = false;
      return;
    }
    onVideoTap();
  }

  return (
    <video
      ref={videoRef}
      src={src}
      className={cn(
        'h-full w-full',
        objectFit === 'cover' ? 'object-cover' : 'object-contain',
        className,
      )}
      playsInline
      loop
      preload={preload}
      onLoadedMetadata={handleLoadedMetadata}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onClick={handleClick}
    />
  );
}

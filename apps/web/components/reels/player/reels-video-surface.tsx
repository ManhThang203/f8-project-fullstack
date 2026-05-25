'use client';

import { useRef } from 'react';

import { cn } from '@/lib/utils';

import type { VideoSize } from '../reels-types';

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

const DOUBLE_TAP_MS = 300;

/** Video element only — sizing handled by VideoStage parent. */
export function ReelsVideoSurface({
  src,
  videoRef,
  onVideoTap,
  onVideoSizeChange,
  className,
  objectFit = 'contain',
  preload = 'metadata',
}: Props) {
  const lastTapRef = useRef<number>(0);

  function handleLoadedMetadata(e: React.SyntheticEvent<HTMLVideoElement>) {
    const video = e.currentTarget;
    if (video.videoWidth <= 0 || video.videoHeight <= 0) return;
    onVideoSizeChange({ width: video.videoWidth, height: video.videoHeight });
  }

  function handleClick() {
    const now = Date.now();
    const delta = now - lastTapRef.current;
    lastTapRef.current = now;
    if (delta < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
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
      onClick={handleClick}
    />
  );
}

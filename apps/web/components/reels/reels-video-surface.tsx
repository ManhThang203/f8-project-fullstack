'use client';

import { useRef } from 'react';

import type { VideoSize } from './reels-types';

export type { VideoSize } from './reels-types';

type Props = {
  src: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTogglePlay: () => void;
  onVideoSizeChange: (size: VideoSize) => void;
  className?: string;
};

const DOUBLE_TAP_MS = 300;

/** Video element only — sizing handled by VideoStage parent. */
export function ReelsVideoSurface({
  src,
  videoRef,
  onTogglePlay,
  onVideoSizeChange,
  className,
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
    onTogglePlay();
  }

  return (
    <video
      ref={videoRef}
      src={src}
      className={className ?? 'h-full w-full object-contain'}
      playsInline
      loop
      preload="metadata"
      onLoadedMetadata={handleLoadedMetadata}
      onClick={handleClick}
    />
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef } from 'react';

import { MAX_FRAME_HEIGHT_PX } from '../media-frame.utils';
import { FeedVideoControlBar } from './feed-video-control-bar';

import { useFeedPostVideo } from '@/hooks/post';
import { markUnmuteOnEntry } from '@/lib/post';
import { cn } from '@/lib/utils';
/** Ngưỡng px: kéo dưới mức này vẫn tính là click (mở Reels), trên thì bỏ qua. */
const DRAG_THRESHOLD_PX = 8;

type Props = {
  src: string;
  postId: string;
  durationMs?: number | null;
  width?: number | null;
  height?: number | null;
  className?: string;
};

/** Video inline trong feed: autoplay muted, bottom controls, click mở Reels. */
export function FeedPostVideo({
  src,
  postId,
  durationMs,
  width,
  height,
  className,
}: Props) {
  const router = useRouter();
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const containerStyle = useMemo(() => {
    if (width && height && width > 0 && height > 0) {
      return { aspectRatio: `${width} / ${height}`, maxHeight: MAX_FRAME_HEIGHT_PX };
    }
    return { aspectRatio: '9 / 16', maxHeight: MAX_FRAME_HEIGHT_PX };
  }, [width, height]);

  const {
    containerRef,
    videoRef,
    isPlaying,
    muted,
    volume,
    togglePlay,
    toggleMute,
    setVolume,
    currentTimeMs,
    durationMs: duration,
    handleSeek,
  } = useFeedPostVideo({ initialDurationMs: durationMs });

  function handlePointerDown(e: React.PointerEvent<HTMLVideoElement>) {
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  }

  function handleVideoClick(e: React.MouseEvent<HTMLVideoElement>) {
    e.stopPropagation();
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start) return;

    const dx = Math.abs(e.clientX - start.x);
    const dy = Math.abs(e.clientY - start.y);

    if (dx > DRAG_THRESHOLD_PX || dy > DRAG_THRESHOLD_PX) return;

    markUnmuteOnEntry();
    router.push(`/reel/${postId}`);
  }

  function handleTogglePlay(e: React.MouseEvent) {
    e.stopPropagation();
    togglePlay();
  }

  function handleToggleMute(e: React.MouseEvent) {
    e.stopPropagation();
    toggleMute();
  }

  function handleVolumeChange(next: number) {
    setVolume(next);
  }

  function handleSeekClick(timeMs: number) {
    handleSeek(timeMs);
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full overflow-hidden rounded-3xl bg-black', className)}
      style={containerStyle}
    >
      <video
        ref={videoRef}
        src={src}
        className="block h-full w-full cursor-pointer object-contain"
        playsInline
        loop
        preload="metadata"
        muted
        onPointerDown={handlePointerDown}
        onClick={handleVideoClick}
      />

      <FeedVideoControlBar
        isPlaying={isPlaying}
        currentTimeMs={currentTimeMs}
        durationMs={duration}
        volume={volume}
        muted={muted}
        onTogglePlay={handleTogglePlay}
        onToggleMute={handleToggleMute}
        onVolumeChange={handleVolumeChange}
        onSeek={handleSeekClick}
      />
    </div>
  );
}

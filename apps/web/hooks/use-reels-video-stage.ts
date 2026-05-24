'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { VideoNaturalSize } from '@/components/reels/reels-types';
import { cn } from '@/lib/utils';

type ContainerSize = { width: number; height: number };

export type UseReelsVideoStageOptions = {
  /** Reserve px for action rail beside video on desktop. */
  sideRailReserve?: number;
  /** Reserve px for far-right nav chevrons. */
  navReserve?: number;
  /** Cap portrait / square stage height (Facebook-style). */
  maxStageHeight?: number;
  /** Tailwind rounded-* class for the stage. */
  roundedClass?: string;
};

const DEFAULTS = {
  sideRailReserve: 72,
  navReserve: 56,
  maxStageHeight: 680,
  roundedClass: 'rounded-xl',
} as const;

type FitStageOptions = {
  sideRailReserve: number;
  navReserve: number;
  maxStageHeight: number;
  isDesktop: boolean;
};

function fitStageDimensions(
  video: VideoNaturalSize,
  container: ContainerSize,
  opts: FitStageOptions,
): { width: number; height: number } {
  const ratio = video.width / video.height;
  const isLandscape = ratio > 1;

  const horizontalReserve =
    32 + (opts.isDesktop ? opts.sideRailReserve + opts.navReserve : 16);
  const maxW = Math.max(160, container.width - horizontalReserve);
  const maxH = Math.min(
    Math.max(200, container.height * 0.9),
    opts.maxStageHeight,
  );

  let width: number;
  let height: number;

  if (isLandscape) {
    width = Math.min(maxW, maxH * ratio);
    height = width / ratio;
    if (height > maxH) {
      height = maxH;
      width = height * ratio;
    }
  } else {
    height = Math.min(maxH, maxW / ratio);
    width = height * ratio;
    if (width > maxW) {
      width = maxW;
      height = width / ratio;
    }
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Computes a capped VideoStage box from natural video dimensions + container.
 * Keeps top controls (play / mute / search) visible and applies Facebook-like rounding.
 */
export function useReelsVideoStage(
  src: string,
  options?: UseReelsVideoStageOptions,
) {
  const sideRailReserve = options?.sideRailReserve ?? DEFAULTS.sideRailReserve;
  const navReserve = options?.navReserve ?? DEFAULTS.navReserve;
  const maxStageHeight = options?.maxStageHeight ?? DEFAULTS.maxStageHeight;
  const roundedClass = options?.roundedClass ?? DEFAULTS.roundedClass;

  const containerRef = useRef<HTMLDivElement>(null);
  const [videoSize, setVideoSize] = useState<VideoNaturalSize | null>(null);
  const [containerSize, setContainerSize] = useState<ContainerSize>({ width: 0, height: 0 });
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setVideoSize(null);
  }, [src]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setContainerSize({ width, height });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const onVideoSizeChange = useCallback((size: VideoNaturalSize) => {
    setVideoSize(size);
  }, []);

  const stageDimensions = useMemo(() => {
    if (!videoSize || containerSize.width <= 0 || containerSize.height <= 0) {
      return null;
    }
    return fitStageDimensions(videoSize, containerSize, {
      sideRailReserve,
      navReserve,
      maxStageHeight,
      isDesktop,
    });
  }, [videoSize, containerSize, sideRailReserve, navReserve, maxStageHeight, isDesktop]);

  const stageClassName = cn(
    'relative shrink-0 overflow-hidden bg-black',
    roundedClass,
    !stageDimensions && 'h-full max-h-full w-full max-w-full',
  );

  const stageStyle = stageDimensions
    ? {
        width: stageDimensions.width,
        height: stageDimensions.height,
        aspectRatio: `${videoSize!.width} / ${videoSize!.height}`,
      }
    : undefined;

  return {
    containerRef,
    videoSize,
    onVideoSizeChange,
    stageClassName,
    stageStyle,
    isReady: stageDimensions !== null,
  };
}

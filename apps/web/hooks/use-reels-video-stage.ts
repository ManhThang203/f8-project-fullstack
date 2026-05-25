'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { ReelsLayoutMode } from '@/components/reels/reels-layout.utils';
import type { VideoNaturalSize } from '@/components/reels/reels-types';
import { cn } from '@/lib/utils';

type ContainerSize = { width: number; height: number };

export type UseReelsVideoStageOptions = {
  layoutMode?: ReelsLayoutMode;
  sideRailReserve?: number;
  navReserve?: number;
  navGap?: number;
  maxStageHeight?: number;
  uniformMaxWidth?: number;
  roundedClass?: string;
  placeholderVideoSize?: VideoNaturalSize;
};

const DEFAULTS = {
  sideRailReserve: 80,
  navReserve: 64,
  navGap: 16,
  maxStageHeight: 680,
  uniformMaxWidth: 580,
  roundedClass: 'rounded-xl',
} as const;

type FitStageOptions = {
  sideRailReserve: number;
  navReserve: number;
  navGap: number;
  maxStageHeight: number;
  uniformMaxWidth: number;
};

/** Desktop stage: chiều ngang cố định, chiều dọc theo tỉ lệ video. */
function fitStageDimensions(
  video: VideoNaturalSize,
  container: ContainerSize,
  opts: FitStageOptions,
): { width: number; height: number } {
  const ratio = video.width / video.height;
  const horizontalReserve = 32 + opts.sideRailReserve + opts.navReserve + opts.navGap;
  const maxW = Math.max(160, container.width - horizontalReserve);
  const stageWidth = Math.min(maxW, opts.uniformMaxWidth);
  const maxH = Math.min(Math.max(200, container.height * 0.9), opts.maxStageHeight);
  const stageHeight = Math.min(stageWidth / ratio, maxH);

  return {
    width: Math.round(stageWidth),
    height: Math.round(stageHeight),
  };
}

/** Tính kích thước stage từ metadata video + container + layout mode. */
export function useReelsVideoStage(src: string, options?: UseReelsVideoStageOptions) {
  const layoutMode = options?.layoutMode ?? 'immersive';
  const sideRailReserve = options?.sideRailReserve ?? DEFAULTS.sideRailReserve;
  const navReserve = options?.navReserve ?? DEFAULTS.navReserve;
  const navGap = options?.navGap ?? DEFAULTS.navGap;
  const maxStageHeight = options?.maxStageHeight ?? DEFAULTS.maxStageHeight;
  const uniformMaxWidth = options?.uniformMaxWidth ?? DEFAULTS.uniformMaxWidth;
  const roundedClass = options?.roundedClass ?? DEFAULTS.roundedClass;
  const placeholderVideoSize = options?.placeholderVideoSize;

  const containerRef = useRef<HTMLDivElement>(null);
  const [videoSize, setVideoSize] = useState<VideoNaturalSize | null>(
    placeholderVideoSize ?? null,
  );
  const [containerSize, setContainerSize] = useState<ContainerSize>({ width: 0, height: 0 });

  useEffect(() => {
    if (placeholderVideoSize) {
      setVideoSize(placeholderVideoSize);
      return;
    }
    setVideoSize(null);
  }, [src, placeholderVideoSize]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerSize({ width: el.clientWidth, height: el.clientHeight });
  }, []);

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

  const onVideoSizeChange = useCallback((size: VideoNaturalSize) => {
    setVideoSize(size);
  }, []);

  const isImmersive = layoutMode === 'immersive';

  const stageDimensions = useMemo(() => {
    if (isImmersive) return null;

    if (containerSize.width <= 0 || containerSize.height <= 0) {
      return null;
    }

    const size = videoSize ?? placeholderVideoSize;
    if (!size) return null;

    return fitStageDimensions(size, containerSize, {
      sideRailReserve,
      navReserve,
      navGap,
      maxStageHeight,
      uniformMaxWidth,
    });
  }, [
    videoSize,
    placeholderVideoSize,
    containerSize,
    isImmersive,
    sideRailReserve,
    navReserve,
    navGap,
    maxStageHeight,
    uniformMaxWidth,
  ]);

  const aspectSize = videoSize ?? placeholderVideoSize;

  const stageClassName = cn(
    'relative shrink-0 overflow-hidden bg-black',
    isImmersive ? 'h-full w-full' : roundedClass,
    !isImmersive && !stageDimensions && 'h-full max-h-full w-full max-w-full',
  );

  const stageStyle =
    !isImmersive && stageDimensions
      ? {
          width: stageDimensions.width,
          height: stageDimensions.height,
          ...(aspectSize && {
            aspectRatio: `${aspectSize.width} / ${aspectSize.height}`,
          }),
        }
      : undefined;

  return {
    containerRef,
    videoSize,
    onVideoSizeChange,
    stageClassName,
    stageStyle,
    isReady: isImmersive || stageDimensions !== null,
    layoutMode,
  };
}

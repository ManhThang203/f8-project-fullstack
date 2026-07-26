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
  roundedClass?: string;
  placeholderVideoSize?: VideoNaturalSize;
};

const DEFAULTS = {
  sideRailReserve: 80,
  navReserve: 64,
  navGap: 16,
  maxStageHeight: 680,
  roundedClass: 'rounded-xl',
  /** Padding nhỏ để bo góc stage hiện rõ trên immersive. */
  immersiveInsetPx: 8,
} as const;

type FitStageOptions = {
  sideRailReserve: number;
  navReserve: number;
  navGap: number;
  maxStageHeight: number;
};

/** Desktop stage: fit trong maxW×maxH, giữ đúng tỉ lệ video (width = đúng chiều ngang video). */
function fitStageDimensions(
  video: VideoNaturalSize,
  container: ContainerSize,
  opts: FitStageOptions,
): { width: number; height: number } {
  const ratio = video.width / video.height;
  const horizontalReserve = 32 + opts.sideRailReserve + opts.navReserve + opts.navGap;
  const maxW = Math.max(160, container.width - horizontalReserve);
  const maxH = Math.min(Math.max(200, container.height * 0.9), opts.maxStageHeight);

  let width = maxW;
  let height = width / ratio;
  if (height > maxH) {
    height = maxH;
    width = height * ratio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/** Tính kích thước stage từ metadata video + container + layout mode. */
export function useReelsVideoStage(src: string, options?: UseReelsVideoStageOptions) {
  const layoutMode = options?.layoutMode ?? 'immersive';
  const sideRailReserve = options?.sideRailReserve ?? DEFAULTS.sideRailReserve;
  const navReserve = options?.navReserve ?? DEFAULTS.navReserve;
  const navGap = options?.navGap ?? DEFAULTS.navGap;
  const maxStageHeight = options?.maxStageHeight ?? DEFAULTS.maxStageHeight;
  const roundedClass = options?.roundedClass ?? DEFAULTS.roundedClass;
  const placeholderVideoSize = options?.placeholderVideoSize;

  const containerRef = useRef<HTMLDivElement>(null);
  const [videoSize, setVideoSize] = useState<VideoNaturalSize | null>(placeholderVideoSize ?? null);
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
    // Immersive: full khung (trừ inset), không shrink theo tỉ lệ — video cover để không lộ đen 2 bên.
    if (isImmersive) {
      if (containerSize.width <= 0 || containerSize.height <= 0) return null;
      const inset = DEFAULTS.immersiveInsetPx * 2;
      return {
        width: Math.max(120, Math.round(containerSize.width - inset)),
        height: Math.max(160, Math.round(containerSize.height - inset)),
      };
    }

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
  ]);

  const aspectSize = videoSize ?? placeholderVideoSize;

  const stageClassName = cn(
    'relative shrink-0 overflow-hidden bg-black',
    roundedClass,
    !stageDimensions && 'h-full max-h-full w-full max-w-full',
  );

  const stageStyle = stageDimensions
    ? isImmersive
      ? {
          width: stageDimensions.width,
          height: stageDimensions.height,
        }
      : {
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

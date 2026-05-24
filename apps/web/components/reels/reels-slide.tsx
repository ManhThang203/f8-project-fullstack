'use client';

import { useEffect, useRef, useState } from 'react';

import { FacebookReelsPlayer } from './facebook-reels-player';
import type { ReelsFeedItemDto } from './reels-types';

type Props = {
  item: ReelsFeedItemDto;
  index: number;
  onBecomeActive?: (index: number) => void;
};

/**
 * One full-height slide in the reels feed.
 * Uses IntersectionObserver to detect when ≥50% visible → tells the player to autoplay.
 */
export function ReelsSlide({ item, index, onBecomeActive }: Props) {
  const slideRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const el = slideRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry) setIsActive(entry.intersectionRatio >= 0.5);
      },
      { threshold: [0, 0.5, 1] },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (isActive) onBecomeActive?.(index);
  }, [isActive, index, onBecomeActive]);

  return (
    <div
      ref={slideRef}
      data-reels-slide
      className="h-[calc(100dvh-3.5rem)] w-full shrink-0 snap-start"
    >
      <FacebookReelsPlayer item={item} isActive={isActive} />
    </div>
  );
}

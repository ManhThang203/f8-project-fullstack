'use client';

import { useReducedMotion } from 'motion/react';

import { cn } from '@/lib/utils';

export function ReelsSkeleton() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* Video area */}
      <div
        className={cn(
          'absolute inset-0 bg-neutral-800',
          !reduceMotion && 'animate-pulse',
        )}
      />
      {/* Gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Bottom meta skeleton */}
      <div className="absolute bottom-14 left-3 right-24 z-20 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className={cn('h-10 w-10 rounded-full bg-neutral-700', !reduceMotion && 'animate-pulse')} />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className={cn('h-3 w-32 rounded bg-neutral-700', !reduceMotion && 'animate-pulse')} />
            <div className={cn('h-2.5 w-20 rounded bg-neutral-700', !reduceMotion && 'animate-pulse')} />
          </div>
          <div className={cn('h-8 w-20 rounded-lg bg-neutral-700', !reduceMotion && 'animate-pulse')} />
        </div>
        <div className={cn('h-3 w-full rounded bg-neutral-700', !reduceMotion && 'animate-pulse')} />
      </div>

      {/* Rail skeleton */}
      <div className="absolute bottom-20 right-3 z-20 flex flex-col items-center gap-5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn('h-11 w-11 rounded-full bg-neutral-700', !reduceMotion && 'animate-pulse')}
          />
        ))}
      </div>

      {/* Progress bar skeleton */}
      <div className="absolute bottom-0 left-0 right-0 z-30 h-0.5 bg-neutral-700" />
    </div>
  );
}

'use client';

import { useReducedMotion } from 'motion/react';

import { cn } from '@/lib/utils';

import { useReelsLayoutMode } from './reels-layout.utils';

function SkeletonPulse({
  className,
  reduceMotion,
}: {
  className?: string;
  reduceMotion: boolean | null;
}) {
  return <div className={cn(className, !reduceMotion && 'animate-pulse')} />;
}

function ImmersiveSkeleton({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <SkeletonPulse className="absolute inset-0 bg-neutral-800" reduceMotion={reduceMotion} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      <div className="reels-immersive-meta absolute bottom-14 left-3 right-16 z-20 flex flex-col gap-3 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center gap-3">
          <SkeletonPulse className="h-10 w-10 rounded-full bg-neutral-700" reduceMotion={reduceMotion} />
          <div className="flex flex-1 flex-col gap-1.5">
            <SkeletonPulse className="h-3 w-32 rounded bg-neutral-700" reduceMotion={reduceMotion} />
            <SkeletonPulse className="h-2.5 w-20 rounded bg-neutral-700" reduceMotion={reduceMotion} />
          </div>
          <SkeletonPulse className="h-8 w-20 rounded-lg bg-neutral-700" reduceMotion={reduceMotion} />
        </div>
        <SkeletonPulse className="h-3 w-full rounded bg-neutral-700" reduceMotion={reduceMotion} />
      </div>

      <div className="reels-immersive-rail absolute bottom-20 right-2 z-20 flex flex-col items-center gap-4 pb-[env(safe-area-inset-bottom)]">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonPulse
            key={i}
            className="h-11 w-11 rounded-full bg-neutral-700"
            reduceMotion={reduceMotion}
          />
        ))}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-30 h-0.5 bg-neutral-700" />
    </div>
  );
}

function StageSkeleton({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black">
      <div className="flex items-center gap-4 lg:gap-5">
        <div className="relative aspect-[9/16] h-[min(680px,90vh)] w-auto max-w-[580px] overflow-hidden rounded-xl bg-neutral-800">
          <SkeletonPulse className="absolute inset-0 bg-neutral-800" reduceMotion={reduceMotion} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          <div className="absolute bottom-10 left-3 right-14 z-20 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <SkeletonPulse className="h-10 w-10 rounded-full bg-neutral-700" reduceMotion={reduceMotion} />
              <div className="flex flex-1 flex-col gap-1.5">
                <SkeletonPulse className="h-3 w-32 rounded bg-neutral-700" reduceMotion={reduceMotion} />
                <SkeletonPulse className="h-2.5 w-20 rounded bg-neutral-700" reduceMotion={reduceMotion} />
              </div>
              <SkeletonPulse className="h-8 w-20 rounded-lg bg-neutral-700" reduceMotion={reduceMotion} />
            </div>
            <SkeletonPulse className="h-3 w-full rounded bg-neutral-700" reduceMotion={reduceMotion} />
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-30 h-0.5 bg-neutral-700" />
        </div>

        <div className="flex shrink-0 flex-col items-center gap-4">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonPulse
              key={i}
              className="h-11 w-11 rounded-full bg-neutral-700"
              reduceMotion={reduceMotion}
            />
          ))}
        </div>
      </div>

      <div className="fixed right-6 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
        <SkeletonPulse className="h-11 w-11 rounded-full bg-neutral-700" reduceMotion={reduceMotion} />
        <SkeletonPulse className="h-11 w-11 rounded-full bg-neutral-700" reduceMotion={reduceMotion} />
      </div>
    </div>
  );
}

export function ReelsSkeleton() {
  const reduceMotion = useReducedMotion();
  const layoutMode = useReelsLayoutMode();

  if (layoutMode === 'stage') {
    return <StageSkeleton reduceMotion={reduceMotion} />;
  }

  return <ImmersiveSkeleton reduceMotion={reduceMotion} />;
}

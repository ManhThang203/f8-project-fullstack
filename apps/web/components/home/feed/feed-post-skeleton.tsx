'use client';

import type { ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import 'react-loading-skeleton/dist/skeleton.css';

export type FeedPostSkeletonVariant = 'full' | 'noMedia' | 'short';

type Props = {
  variant?: FeedPostSkeletonVariant;
};

// Định dạng skeleton cho bài viết trong feed
export function FeedPostSkeleton({ variant = 'full' }: Props) {
  return (
    <li className="border-border border-b px-1 py-4 first:pt-0 last:border-b-0" aria-hidden>
      <article className="flex gap-3">
        {/* Avatar */}
        <div className="mt-0.5 shrink-0">
          <Skeleton circle width={40} height={40} />
        </div>
        {/* Header */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton height={14} width="45%" />
              <Skeleton height={12} width="30%" />
            </div>
            <Skeleton circle width={44} height={44} />
          </div>
          {/* Content */}
          <div className="mt-2 space-y-1.5">
            {variant === 'short' ? (
              <Skeleton height={14} width="70%" />
            ) : (
              <>
                <Skeleton height={14} width="100%" />
                <Skeleton height={14} width="85%" />
                {variant === 'full' ? <Skeleton height={14} width="60%" /> : null}
              </>
            )}
          </div>

          {/* Media */}
          {variant === 'full' ? (
            <div className="mt-3 overflow-hidden rounded-[var(--radius)]">
              <Skeleton height={192} />
            </div>
          ) : null}
          {/* Actions */}
          <div className="mt-3 flex items-center gap-4">
            <Skeleton circle width={20} height={20} />
            <Skeleton circle width={20} height={20} />
            <Skeleton circle width={20} height={20} />
          </div>
        </div>
      </article>
    </li>
  );
}

type ThemeProps = {
  children: ReactNode;
};

// Theme cho skeleton feed
export function FeedSkeletonTheme({ children }: ThemeProps) {
  const reduceMotion = useReducedMotion();

  {
    /* Theme cho skeleton feed */
  }
  return (
    <SkeletonTheme
      baseColor="hsl(var(--muted))"
      highlightColor="hsl(var(--accent))"
      enableAnimation={!reduceMotion}
    >
      {children}
    </SkeletonTheme>
  );
}

'use client';

import { FeedPostSkeleton, FeedSkeletonTheme } from './feed-post-skeleton';

const SKELETON_ITEMS: Array<{ variant: 'full' | 'noMedia' | 'short' }> = [
  { variant: 'full' },
  { variant: 'noMedia' },
  { variant: 'short' },
  { variant: 'full' },
];

export function FeedSkeletonList() {
  return (
    <>
      <span className="sr-only">Đang tải feed…</span>
      <FeedSkeletonTheme>
        <ul className="flex flex-col">
          {SKELETON_ITEMS.map((item, index) => (
            <FeedPostSkeleton key={index} variant={item.variant} />
          ))}
        </ul>
      </FeedSkeletonTheme>
    </>
  );
}

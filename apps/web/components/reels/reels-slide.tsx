'use client';

import { FacebookReelsPlayer } from './player/facebook-reels-player';
import type { ReelsFeedItemDto, ReelsPlayerProps } from './reels-types';

type Props = {
  item: ReelsFeedItemDto;
  slideHeight: string;
  isActive: boolean;
  currentUserId?: string;
  currentUser?: ReelsPlayerProps['currentUser'];
};

/**
 * One full-height slide in the reels feed.
 * Autoplay được điều khiển từ ngoài qua prop `isActive` (theo activeIndex).
 */
export function ReelsSlide({ item, slideHeight, isActive, currentUserId, currentUser }: Props) {
  return (
    <div data-reels-slide className="w-full shrink-0 snap-start" style={{ height: slideHeight }}>
      <FacebookReelsPlayer
        item={item}
        isActive={isActive}
        currentUserId={currentUserId}
        currentUser={currentUser}
      />
    </div>
  );
}

import type { ReelsFeedItemDto } from '@threads/shared';

export type { ReelsFeedItemDto };

export type VideoNaturalSize = { width: number; height: number };

export type VideoSize = VideoNaturalSize;

export type ReelsPlayerProps = {
  item: ReelsFeedItemDto;
  isActive: boolean;
};

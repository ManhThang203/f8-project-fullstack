import type { ReelsFeedItemDto } from '@costy/shared';

export type { ReelsFeedItemDto };

export type VideoNaturalSize = { width: number; height: number };

export type VideoSize = VideoNaturalSize;

export type ReelsPlayerProps = {
  item: ReelsFeedItemDto;
  isActive: boolean;
  currentUserId?: string;
  currentUser?: {
    id: string;
    username?: string | null;
    name?: string | null;
    image?: string | null;
  } | null;
};

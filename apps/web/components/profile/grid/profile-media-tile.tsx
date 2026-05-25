'use client';

import type { ProfileGridItemDto } from '@threads/shared';
import { Copy, Heart, MessageCircle, Play } from 'lucide-react';
import { useReducedMotion } from 'motion/react';

import { cn } from '@/lib/utils';

type Props = {
  item: ProfileGridItemDto;
  username: string;
  onClick: () => void;
};

export function ProfileMediaTile({ item, username, onClick }: Props) {
  const reduceMotion = useReducedMotion();
  const label = `Bài viết của @${username}, ${item.likeCount} lượt thích, ${item.replyCount} phản hồi`;

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'bg-muted group relative aspect-square w-full overflow-hidden',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
        !reduceMotion && 'hover:scale-[1.02] transition-transform duration-150',
      )}
    >
      {item.thumbnailUrl ? (
        <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="bg-muted h-full w-full" />
      )}

      {item.isVideo ? (
        <span className="absolute right-2 top-2 text-primary-foreground drop-shadow">
          <Play className="h-5 w-5 fill-current" aria-hidden />
        </span>
      ) : null}

      {item.mediaCount > 1 ? (
        <span className="absolute right-2 top-2 text-primary-foreground drop-shadow">
          <Copy className="h-4 w-4" aria-hidden />
        </span>
      ) : null}

      <span
        className={cn(
          'absolute inset-0 flex items-center justify-center gap-4 bg-black/40 text-sm font-semibold text-white opacity-0',
          'group-hover:opacity-100 transition-opacity duration-150',
          reduceMotion && 'hidden',
        )}
        aria-hidden
      >
        <span className="flex items-center gap-1">
          <Heart className="h-4 w-4 fill-current" />
          {item.likeCount}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="h-4 w-4 fill-current" />
          {item.replyCount}
        </span>
      </span>
    </button>
  );
}

'use client';

import type { ProfileGridItemDto } from '@costy/shared';
import { profileGridPreviewUrl } from '@costy/shared';
import { Copy, Heart, MessageCircle, Play } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

type Props = {
  item: ProfileGridItemDto;
  username: string;
  onClick: () => void;
};

export function ProfileMediaTile({ item, username, onClick }: Props) {
  const reduceMotion = useReducedMotion();
  const [previewFailed, setPreviewFailed] = useState(false);
  const cCount = item.commentCount ?? item.replyCount;
  const label = `Bài viết của @${username}, ${item.likeCount} lượt thích, ${cCount} phản hồi`;
  const previewUrl =
    item.thumbnailUrl ||
    profileGridPreviewUrl(item.mediaUrl ?? '', item.isVideo);
  const videoSrc = item.mediaUrl || item.thumbnailUrl;

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'bg-muted group relative aspect-square w-full overflow-hidden',
        'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset',
        !reduceMotion && 'transition-transform duration-150 hover:scale-[1.02]',
      )}
    >
      {item.isVideo && previewFailed && videoSrc ? (
        <video
          src={videoSrc}
          className="h-full w-full object-cover"
          muted
          playsInline
          preload="metadata"
          aria-hidden
        />
      ) : previewUrl ? (
        <img
          src={previewUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => {
            if (item.isVideo) setPreviewFailed(true);
          }}
        />
      ) : (
        <div className="bg-muted h-full w-full" />
      )}

      {item.isVideo ? (
        <span className="text-primary-foreground absolute right-2 top-2 drop-shadow">
          <Play className="h-5 w-5 fill-current" aria-hidden />
        </span>
      ) : null}

      {item.mediaCount > 1 ? (
        <span className="text-primary-foreground absolute right-2 top-2 drop-shadow">
          <Copy className="h-4 w-4" aria-hidden />
        </span>
      ) : null}

      <span
        className={cn(
          'absolute inset-0 flex items-center justify-center gap-4 bg-black/40 text-sm font-semibold text-white opacity-0',
          'transition-opacity duration-150 group-hover:opacity-100',
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
          {cCount}
        </span>
      </span>
    </button>
  );
}

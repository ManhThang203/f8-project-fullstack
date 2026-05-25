'use client';

import {
  Bookmark,
  MessageCircle,
  MoreHorizontal,
  Share2,
  ThumbsUp,
} from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

type Props = {
  isLiked: boolean;
  onLike: (e: React.MouseEvent) => void;
  onComment: (e: React.MouseEvent) => void;
  onShare: (e: React.MouseEvent) => void;
  onSave: (e: React.MouseEvent) => void;
  onMore: (e: React.MouseEvent) => void;
  className?: string;
};

const btnBase =
  'flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60';
const iconWrap =
  'flex min-h-11 min-w-11 items-center justify-center rounded-full text-white transition-colors duration-150 hover:bg-white/10';

export function ReelsActionRail({
  isLiked,
  onLike,
  onComment,
  onShare,
  onSave,
  onMore,
  className,
}: Props) {
  const [likeAnimating, setLikeAnimating] = useState(false);
  const reduceMotion = useReducedMotion();

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    if (!reduceMotion) {
      setLikeAnimating(true);
      setTimeout(() => setLikeAnimating(false), 300);
    }
    onLike(e);
  }

  return (
    <div className={cn('z-20 flex flex-col items-center gap-4', className)}>
      <button type="button" aria-label="Thích" className={btnBase} onClick={handleLike}>
        <span
          className={cn(
            iconWrap,
            likeAnimating && 'motion-safe:scale-125',
            'transition-transform duration-150',
          )}
        >
          <ThumbsUp
            className={cn('h-7 w-7 stroke-[1.5]', isLiked && 'fill-white')}
            aria-hidden
          />
        </span>
      </button>

      <button
        type="button"
        aria-label="Bình luận"
        className={btnBase}
        onClick={(e) => {
          e.stopPropagation();
          onComment(e);
        }}
      >
        <span className={iconWrap}>
          <MessageCircle className="h-7 w-7 stroke-[1.5]" aria-hidden />
        </span>
      </button>

      <button
        type="button"
        aria-label="Chia sẻ"
        className={btnBase}
        onClick={(e) => {
          e.stopPropagation();
          onShare(e);
        }}
      >
        <span className={iconWrap}>
          <Share2 className="h-7 w-7 stroke-[1.5]" aria-hidden />
        </span>
      </button>

      <button
        type="button"
        aria-label="Lưu"
        className={btnBase}
        onClick={(e) => {
          e.stopPropagation();
          onSave(e);
        }}
      >
        <span className={iconWrap}>
          <Bookmark className="h-7 w-7 stroke-[1.5]" aria-hidden />
        </span>
      </button>

      <button
        type="button"
        aria-label="Thêm tuỳ chọn"
        className={btnBase}
        onClick={(e) => {
          e.stopPropagation();
          onMore(e);
        }}
      >
        <span className={iconWrap}>
          <MoreHorizontal className="h-7 w-7 stroke-[1.5]" aria-hidden />
        </span>
      </button>
    </div>
  );
}

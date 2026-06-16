'use client';

import { Bookmark, MessageCircle, MoreHorizontal, Share2, ThumbsUp } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

type Props = {
  isLiked: boolean;
  saved?: boolean;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  onLike: (e: React.MouseEvent) => void;
  onComment: (e: React.MouseEvent) => void;
  onShare: (e: React.MouseEvent) => void;
  onSave: (e: React.MouseEvent) => void;
  onMore: (e: React.MouseEvent) => void;
  className?: string;
};

const btnBase =
  'flex flex-col items-center justify-center gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60';
const iconWrap =
  'flex min-h-11 min-w-11 items-center justify-center rounded-full text-white transition-colors duration-150 hover:bg-white/10';
const countClass = 'text-xs font-semibold text-white tabular-nums';

/** Hiển thị số đếm dạng rút gọn (1.2k) cho rail reels. */
function formatRailCount(value?: number): string | null {
  if (!value || value <= 0) return null;
  if (value < 1000) return String(value);
  return `${(value / 1000).toFixed(value % 1000 >= 100 ? 1 : 0)}k`;
}

export function ReelsActionRail({
  isLiked,
  saved,
  likeCount,
  commentCount,
  shareCount,
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
          <ThumbsUp className={cn('h-7 w-7 stroke-[1.5]', isLiked && 'fill-white')} aria-hidden />
        </span>
        {formatRailCount(likeCount) ? (
          <span className={countClass}>{formatRailCount(likeCount)}</span>
        ) : null}
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
        {formatRailCount(commentCount) ? (
          <span className={countClass}>{formatRailCount(commentCount)}</span>
        ) : null}
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
        {formatRailCount(shareCount) ? (
          <span className={countClass}>{formatRailCount(shareCount)}</span>
        ) : null}
      </button>

      <button
        type="button"
        aria-label={saved ? 'Bỏ lưu' : 'Lưu'}
        className={btnBase}
        onClick={(e) => {
          e.stopPropagation();
          onSave(e);
        }}
      >
        <span className={iconWrap}>
          <Bookmark className={cn('h-7 w-7 stroke-[1.5]', saved && 'fill-white')} aria-hidden />
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

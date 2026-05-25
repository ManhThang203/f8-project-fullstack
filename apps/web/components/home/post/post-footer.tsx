'use client';

import { MessageCircle, Share2, ThumbsUp } from 'lucide-react';

import { ActionButton } from './action-button';
import { ReactionFace, type PostReactionId } from './reaction-face';

import { cn } from '@/lib/utils';

type Props = {
  likeCount: number;
  replyCount: number;
  shareCount: number;
  summaryReactions: PostReactionId[];
  onLikeClick?: () => void;
  onCommentClick?: () => void;
  onShareClick?: () => void;
  onLikeHoverEnter?: () => void;
  onLikeHoverLeave?: () => void;
  onLikePointerDown?: () => void;
  onLikePointerUp?: () => void;
  onLikePointerLeave?: () => void;
};

export function PostFooter({
  likeCount,
  replyCount,
  shareCount,
  summaryReactions,
  onLikeClick,
  onCommentClick,
  onShareClick,
  onLikeHoverEnter,
  onLikeHoverLeave,
  onLikePointerDown,
  onLikePointerUp,
  onLikePointerLeave,
}: Props) {
  return (
    <footer
      className={cn(
        'border-border/60 dark:border-white/10',
        'bg-muted dark:bg-[#242526]',
        'flex h-12 items-center justify-between border-t px-4',
      )}
    >
      <div className="flex items-center gap-2">
        <div className="relative" onMouseEnter={onLikeHoverEnter} onMouseLeave={onLikeHoverLeave}>
          <ActionButton
            icon={<ThumbsUp className="h-4 w-4" strokeWidth={1.75} />}
            count={likeCount > 0 ? likeCount : undefined}
            label={likeCount > 0 ? `${likeCount} lượt thích` : 'Thích'}
            onClick={onLikeClick}
            onPointerDown={onLikePointerDown}
            onPointerUp={onLikePointerUp}
            onPointerLeave={onLikePointerLeave}
          />
        </div>

        <ActionButton
          icon={<MessageCircle className="h-4 w-4" strokeWidth={1.75} />}
          count={replyCount > 0 ? replyCount : undefined}
          label={replyCount > 0 ? `${replyCount} bình luận` : 'Bình luận'}
          onClick={onCommentClick}
        />

        <ActionButton
          icon={<Share2 className="h-4 w-4" strokeWidth={1.75} />}
          count={shareCount > 0 ? shareCount : undefined}
          label="Chia sẻ"
          onClick={onShareClick}
        />
      </div>

      {summaryReactions.length > 0 && (
        <div className="flex shrink-0 items-center" aria-hidden>
          {summaryReactions.map((id, index) => (
            <span
              key={`${id}-${index}`}
              className={cn('relative', index > 0 && '-ml-2')}
              style={{ zIndex: summaryReactions.length - index }}
            >
              <ReactionFace
                id={id}
                size="sm"
                className="ring-background rounded-full ring-2 dark:ring-[#242526]"
              />
            </span>
          ))}
        </div>
      )}
    </footer>
  );
}

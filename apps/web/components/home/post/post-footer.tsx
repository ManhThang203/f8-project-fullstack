'use client';

import { MessageCircle, Share2, ThumbsUp } from 'lucide-react';

import { ActionButton } from './action-button';
import { ReactionFace, type PostReactionId, REACTION_LABELS, REACTION_COLORS } from './reaction-face';

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
  currentReaction?: PostReactionId | null;
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
  currentReaction,
}: Props) {
  const isLiked = currentReaction === 'like';
  const hasReaction = !!currentReaction;

  let likeLabel = 'Thích';
  let likeIcon = <ThumbsUp className="h-4 w-4" strokeWidth={1.75} />;
  let likeColor = '';

  if (hasReaction) {
    likeLabel = REACTION_LABELS[currentReaction];
    likeColor = REACTION_COLORS[currentReaction];
    // If it's anything but a normal 'like', show the reaction face
    if (!isLiked) {
      likeIcon = <ReactionFace id={currentReaction} size="sm" />;
    } else {
      likeIcon = <ThumbsUp className="h-4 w-4 fill-current" strokeWidth={1.75} />;
    }
  }

  if (likeCount > 0) {
    likeLabel = `${likeCount} ${likeLabel.toLowerCase()}`;
  }

  return (
    <footer
      className={cn(
        'border-border/60 dark:border-white/10',
        'bg-muted dark:bg-[#242526]',
        'flex h-12 items-center justify-between border-t px-4',
      )}
    >
      <div className="flex flex-1 items-center justify-between gap-1">
        <div className="relative flex flex-1" onMouseEnter={onLikeHoverEnter} onMouseLeave={onLikeHoverLeave}>
          <ActionButton
            icon={likeIcon}
            count={likeCount > 0 ? likeCount : undefined}
            label={likeLabel}
            onClick={onLikeClick}
            onPointerDown={onLikePointerDown}
            onPointerUp={onLikePointerUp}
            onPointerLeave={onLikePointerLeave}
            className={likeColor}
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

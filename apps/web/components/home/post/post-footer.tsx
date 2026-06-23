'use client';

import { Bookmark, MessageCircle, Share2, ThumbsUp } from 'lucide-react';

import { ActionButton } from './action-button';
import {
  ReactionFace,
  type PostReactionId,
  REACTION_LABELS,
  REACTION_COLORS,
} from './reaction-face';

import { cn } from '@/lib/utils';

type Props = {
  likeCount: number;
  replyCount: number;
  /** Tổng bình luận mọi cấp; fallback về replyCount nếu chưa có. */
  commentCount?: number;
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
  onSaveClick?: () => void;
  saved?: boolean;
  currentReaction?: PostReactionId | null;
};

export function PostFooter({
  likeCount,
  replyCount,
  commentCount,
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
  onSaveClick,
  saved,
  currentReaction,
}: Props) {
  const isLiked = currentReaction === 'like';
  const hasReaction = !!currentReaction;

  let likeLabel = 'Thích';
  let likeIcon = <ThumbsUp className="h-5 w-5" strokeWidth={1.75} />;
  let likeColor = '';

  if (hasReaction) {
    likeLabel = REACTION_LABELS[currentReaction];
    likeColor = REACTION_COLORS[currentReaction];
    // If it's anything but a normal 'like', show the reaction face
    if (!isLiked) {
      likeIcon = <ReactionFace id={currentReaction} size="sm" />;
    } else {
      likeIcon = <ThumbsUp className="h-5 w-5 fill-current" strokeWidth={1.75} />;
    }
  }

  if (likeCount > 0) {
    likeLabel = `${likeCount} ${likeLabel.toLowerCase()}`;
  }

  const effectiveCount = commentCount ?? replyCount;

  return (
    <footer
      className={cn(
        'border-border/60 dark:border-white/10',
        'bg-muted dark:bg-[#242526]',
        'flex h-12 items-center justify-between border-t px-4',
      )}
    >
      <div className="flex flex-1 items-center justify-between gap-1">
        <div
          className="relative flex flex-1"
          onMouseEnter={onLikeHoverEnter}
          onMouseLeave={onLikeHoverLeave}
        >
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
          icon={<MessageCircle className="h-5 w-5" strokeWidth={1.75} />}
          count={effectiveCount > 0 ? effectiveCount : undefined}
          label={effectiveCount > 0 ? `${effectiveCount} bình luận` : 'Bình luận'}
          onClick={onCommentClick}
        />

        <ActionButton
          icon={<Share2 className="h-5 w-5" strokeWidth={1.75} />}
          count={shareCount > 0 ? shareCount : undefined}
          label="Chia sẻ"
          onClick={onShareClick}
        />

        <ActionButton
          icon={
            <Bookmark className={cn('h-5 w-5', saved && 'fill-current')} strokeWidth={1.75} />
          }
          label={saved ? 'Đã lưu' : 'Lưu'}
          onClick={onSaveClick}
          className={saved ? 'text-primary' : ''}
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

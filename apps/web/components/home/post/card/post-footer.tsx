'use client';

import { Bookmark, MessageCircle, Share2, ThumbsUp } from 'lucide-react';

import { ActionButton } from './action-button';

import {
  ReactionFace,
  type PostReactionId,
  REACTION_LABELS,
  REACTION_COLORS,
} from '@/components/home/post/reactions/reaction-face';
import { ReactionPickerPopover } from '@/components/home/post/reactions/reaction-picker-popover';
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
  reactionPicker?: {
    open: boolean;
    onOpen: () => void;
    onScheduleClose: () => void;
    onDismiss?: () => void;
    reactions: { id: PostReactionId; label: string }[];
    onSelect: (id: PostReactionId) => void;
  };
  onLikePointerDown?: () => void;
  onLikePointerUp?: () => void;
  onLikePointerLeave?: () => void;
  onLikePointerCancel?: () => void;
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
  reactionPicker,
  onLikePointerDown,
  onLikePointerUp,
  onLikePointerLeave,
  onLikePointerCancel,
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
      likeIcon = <ReactionFace id={currentReaction} size="xs" />;
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
        'bg-muted flex min-h-12 items-center justify-between rounded-2xl px-3 py-1',
      )}
    >
      <div className="flex flex-1 items-center justify-between gap-1">
        {reactionPicker ? (
          <ReactionPickerPopover
            open={reactionPicker.open}
            onOpen={reactionPicker.onOpen}
            onScheduleClose={reactionPicker.onScheduleClose}
            onDismiss={reactionPicker.onDismiss}
            reactions={reactionPicker.reactions}
            onSelect={reactionPicker.onSelect}
            className="flex flex-1"
            toolbarClassName="border-0"
            zIndexClassName="z-20"
          >
            <ActionButton
              icon={likeIcon}
              count={likeCount > 0 ? likeCount : undefined}
              label={likeLabel}
              onClick={onLikeClick}
              onPointerDown={onLikePointerDown}
              onPointerUp={onLikePointerUp}
              onPointerLeave={onLikePointerLeave}
              onPointerCancel={onLikePointerCancel}
              className={likeColor}
            />
          </ReactionPickerPopover>
        ) : (
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
              onPointerCancel={onLikePointerCancel}
              className={likeColor}
            />
          </div>
        )}

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
                className="ring-muted ring-2"
              />
            </span>
          ))}
        </div>
      )}
    </footer>
  );
}

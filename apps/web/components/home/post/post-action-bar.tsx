'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { PostFooter } from './post-footer';
import { ReactionFace, type PostReactionId } from './reaction-face';
import { useReactPost } from '@/hooks/use-react-post';

import { cn } from '@/lib/utils';

export type { PostReactionId };

const REACTIONS: { id: PostReactionId; label: string }[] = [
  { id: 'like', label: 'Thích' },
  { id: 'love', label: 'Yêu thích' },
  { id: 'care', label: 'Thương thương' },
  { id: 'haha', label: 'Haha' },
  { id: 'wow', label: 'Wow' },
  { id: 'sad', label: 'Buồn' },
  { id: 'angry', label: 'Phẫn nộ' },
];

const PICKER_HIDE_MS = 200;
const LONG_PRESS_MS = 400;

type Props = {
  postId: string;
  replyCount: number;
  initialLikeCount: number;
  initialReaction: PostReactionId | null;
  onCommentClick?: () => void;
};

function reactionSummaryStack(
  reaction: PostReactionId | null | undefined,
  likeCount: number,
): PostReactionId[] {
  if (likeCount <= 0) return [];
  const primary = reaction || 'like';
  const secondary = primary === 'like' ? 'haha' : 'like';
  return [primary, secondary];
}

export function PostActionBar({ postId, replyCount, initialLikeCount, initialReaction, onCommentClick }: Props) {
  const [shareCount, setShareCount] = useState(0);
  const [showPicker, setShowPicker] = useState(false);

  const reactMutation = useReactPost();

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHidePicker = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => setShowPicker(false), PICKER_HIDE_MS);
  }, [clearHideTimer]);

  const openPicker = useCallback(() => {
    clearHideTimer();
    setShowPicker(true);
  }, [clearHideTimer]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  function submitReaction(newReaction: PostReactionId | null) {
    reactMutation.mutate({ postId, type: newReaction }, {
      onError: () => {
        toast.error('Có lỗi xảy ra, vui lòng thử lại');
      }
    });
  }

  function selectReaction(id: PostReactionId) {
    setShowPicker(false);
    if (initialReaction === id) {
      submitReaction(null);
    } else {
      submitReaction(id);
    }
  }

  function toggleLike() {
    if (initialReaction === 'like') {
      submitReaction(null);
    } else if (initialReaction === null) {
      submitReaction('like');
    } else {
      submitReaction('like');
    }
  }

  function handleComment() {
    if (onCommentClick) {
      onCommentClick();
    } else {
      toast.message('Bình luận — tính năng sắp có');
    }
  }

  async function handleShare() {
    const url = window.location.href;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Threads', url });
        setShareCount((c) => c + 1);
        return;
      } catch {
        /* cancelled */
      }
    }
    toast.message('Chia sẻ — tính năng sắp có');
    setShareCount((c) => c + 1);
  }

  const summaryReactions = useMemo(
    () => reactionSummaryStack(initialReaction, initialLikeCount),
    [initialReaction, initialLikeCount],
  );

  return (
    <div className="relative mt-3">
      {showPicker && (
        <div
          role="toolbar"
          aria-label="Chọn cảm xúc"
          className={cn(
            'bg-card absolute bottom-full left-0 z-20 mb-2 flex items-center',
            'rounded-full px-1.5 py-1.5 shadow-lg',
          )}
          onMouseEnter={openPicker}
          onMouseLeave={scheduleHidePicker}
        >
          <div className="flex items-center gap-0.5">
            {REACTIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-label={r.label}
                title={r.label}
                onClick={() => selectReaction(r.id)}
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                  'transition-transform duration-150 motion-safe:hover:z-10 motion-safe:hover:scale-125',
                  'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                )}
              >
                <ReactionFace id={r.id} />
              </button>
            ))}
          </div>
        </div>
      )}

      <PostFooter
        likeCount={initialLikeCount}
        replyCount={replyCount}
        shareCount={shareCount}
        summaryReactions={summaryReactions}
        onLikeClick={toggleLike}
        onCommentClick={handleComment}
        onShareClick={() => void handleShare()}
        onLikeHoverEnter={openPicker}
        onLikeHoverLeave={scheduleHidePicker}
        onLikePointerDown={() => {
          longPressRef.current = setTimeout(() => openPicker(), LONG_PRESS_MS);
        }}
        onLikePointerUp={() => {
          if (longPressRef.current) {
            clearTimeout(longPressRef.current);
            longPressRef.current = null;
          }
        }}
        onLikePointerLeave={() => {
          if (longPressRef.current) {
            clearTimeout(longPressRef.current);
            longPressRef.current = null;
          }
        }}
        currentReaction={initialReaction}
      />

    </div>
  );
}

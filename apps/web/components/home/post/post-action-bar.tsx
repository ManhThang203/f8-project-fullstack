'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { PostFooter } from './post-footer';
import { ReactionFace, type PostReactionId } from './reaction-face';

import { useSharePost, useToggleSavePost } from '@/hooks/queries/use-save-post';
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
  initialShareCount?: number;
  initialSavedByMe?: boolean;
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

export function PostActionBar({
  postId,
  replyCount,
  initialLikeCount,
  initialReaction,
  initialShareCount = 0,
  initialSavedByMe = false,
  onCommentClick,
}: Props) {
  const [shareCount, setShareCount] = useState(initialShareCount);
  const [saved, setSaved] = useState(initialSavedByMe);
  const [showPicker, setShowPicker] = useState(false);

  const reactMutation = useReactPost();
  const saveMutation = useToggleSavePost();
  const shareMutation = useSharePost();

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
    reactMutation.mutate(
      { postId, type: newReaction },
      {
        onError: () => {
          toast.error('Có lỗi xảy ra, vui lòng thử lại');
        },
      },
    );
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

  /** Toggle lưu bài với optimistic update, revert khi lỗi. */
  function handleSave() {
    const next = !saved;
    setSaved(next);
    saveMutation.mutate(
      { postId, save: next },
      {
        onSuccess: (data) => {
          setSaved(data.savedByMe);
          toast.success(data.savedByMe ? 'Đã lưu bài viết' : 'Đã bỏ lưu');
        },
        onError: () => {
          setSaved(!next);
          toast.error('Có lỗi xảy ra, vui lòng thử lại');
        },
      },
    );
  }

  /** Chia sẻ bài: copy link + ghi nhận lượt chia sẻ ở backend. */
  async function handleShare() {
    const path = `${window.location.origin}/?post=${postId}`;
    let sharedNatively = false;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Costy', url: path });
        sharedNatively = true;
      } catch {
        /* cancelled */
      }
    }
    if (!sharedNatively) {
      try {
        await navigator.clipboard.writeText(path);
        toast.success('Đã sao chép liên kết');
      } catch {
        toast.error('Không thể sao chép liên kết');
      }
    }
    shareMutation.mutate(postId, {
      onSuccess: (data) => setShareCount(data.shareCount),
    });
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
        onSaveClick={handleSave}
        saved={saved}
        currentReaction={initialReaction}
      />
    </div>
  );
}

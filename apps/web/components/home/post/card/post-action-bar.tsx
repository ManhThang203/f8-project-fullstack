'use client';

import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { PostFooter } from './post-footer';

import type { PostReactionId } from '@/components/home/post/reactions/reaction-face';
import { useReactionPickerHover, useReactPost } from '@/hooks/post';
import { useSharePost, useToggleSavePost } from '@/hooks/queries/posts';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { displayTopReactions } from '@/lib/post';

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

const LONG_PRESS_MS = 400;

type Props = {
  postId: string;
  authorUsername: string;
  hasVideo?: boolean;
  replyCount: number;
  /** Tổng mọi cấp cho nhãn bình luận */
  commentCount?: number;
  initialLikeCount: number;
  initialReaction: PostReactionId | null;
  topReactions?: string[];
  initialShareCount?: number;
  initialSavedByMe?: boolean;
  onCommentClick?: () => void;
};

export function PostActionBar({
  postId,
  authorUsername,
  hasVideo = false,
  replyCount,
  commentCount,
  initialLikeCount,
  initialReaction,
  topReactions = [],
  initialShareCount = 0,
  initialSavedByMe = false,
  onCommentClick,
}: Props) {
  const [shareCount, setShareCount] = useState(initialShareCount);
  const [saved, setSaved] = useState(initialSavedByMe);

  const { requireAuth } = useRequireAuth();
  const reactMutation = useReactPost();
  const saveMutation = useToggleSavePost();
  const shareMutation = useSharePost();

  const { showPicker, setShowPicker, openPicker, scheduleHidePicker } = useReactionPickerHover();

  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function submitReaction(newReaction: PostReactionId | null) {
    if (!requireAuth()) return;
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
    if (!requireAuth()) return;
    onCommentClick?.();
  }

  /** Toggle lưu bài với optimistic update, revert khi lỗi. */
  function handleSave() {
    if (!requireAuth()) return;
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
    if (!requireAuth()) return;
    const sharePath = hasVideo
      ? `/reel/${postId}`
      : `/${authorUsername}/post/${postId}`;
    const path = `${window.location.origin}${sharePath}`;
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
    () => displayTopReactions(topReactions, initialLikeCount, initialReaction),
    [topReactions, initialLikeCount, initialReaction],
  );

  return (
    <div className="relative mt-4">
      <PostFooter
        likeCount={initialLikeCount}
        replyCount={replyCount}
        commentCount={commentCount}
        shareCount={shareCount}
        summaryReactions={summaryReactions}
        onLikeClick={toggleLike}
        onCommentClick={handleComment}
        onShareClick={() => void handleShare()}
        reactionPicker={{
          open: showPicker,
          onOpen: openPicker,
          onScheduleClose: scheduleHidePicker,
          reactions: REACTIONS,
          onSelect: selectReaction,
        }}
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

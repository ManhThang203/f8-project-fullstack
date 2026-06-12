'use client';

import type { PostFeedItemDto } from '@costy/shared';
import { MoreHorizontal } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

import { PostMediaCarousel } from '../post-media/post-media-carousel';

import type { PostReactionId } from './reaction-face';
import { ReactionFace, REACTION_COLORS, REACTION_LABELS } from './reaction-face';

import { Avatar } from '@/components/shared/avatar';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useDeletePost } from '@/hooks/queries/use-delete-post';
import { usePostComments } from '@/hooks/queries/use-post-comments';
import { useReactPost } from '@/hooks/use-react-post';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

const COMMENT_REACTIONS: PostReactionId[] = [
  'like',
  'love',
  'care',
  'haha',
  'wow',
  'sad',
  'angry',
];

const PICKER_HIDE_MS = 200;

type Props = {
  comment: PostFeedItemDto;
  onReply: (username: string, commentId: string) => void;
  isReply?: boolean;
};

export function CommentItem({ comment, onReply, isReply = false }: Props) {
  const { data: session } = authClient.useSession();
  const me = session?.user;
  const isOwner = me?.id === comment.author.id;

  const reactMutation = useReactPost();
  const deleteMutation = useDeletePost();

  const {
    data: repliesData,
    hasNextPage: hasMoreReplies,
    fetchNextPage: fetchReplies,
  } = usePostComments(comment.id, 'asc', !isReply && comment.replyCount > 0);
  const replies = repliesData?.pages.flatMap((p) => p.items) || [];

  const [showPicker, setShowPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [localReaction, setLocalReaction] = useState(comment.myReaction);
  const [localLikeCount, setLocalLikeCount] = useState(comment.likeCount);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const openPicker = useCallback(() => {
    clearHideTimer();
    setShowPicker(true);
  }, [clearHideTimer]);

  const scheduleHidePicker = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => setShowPicker(false), PICKER_HIDE_MS);
  }, [clearHideTimer]);

  useEffect(() => {
    setLocalReaction(comment.myReaction);
    setLocalLikeCount(comment.likeCount);
  }, [comment.myReaction, comment.likeCount]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  useEffect(() => {
    if (!showMenu) return;
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [showMenu]);

  function handleLike() {
    const isLiked = localReaction !== null;
    const newReaction = isLiked ? null : 'like';

    setLocalLikeCount((prev) => (isLiked ? Math.max(0, prev - 1) : prev + 1));
    setLocalReaction(newReaction);

    reactMutation.mutate({
      postId: comment.id,
      type: newReaction,
    });
  }

  function handleReaction(type: PostReactionId) {
    setShowPicker(false);

    const isSameReaction = localReaction === type;
    const newReaction = isSameReaction ? null : type;

    const wasLiked = localReaction !== null;
    const isLikedNow = newReaction !== null;
    let newCount = localLikeCount;
    if (!wasLiked && isLikedNow) newCount++;
    if (wasLiked && !isLikedNow) newCount = Math.max(0, newCount - 1);

    setLocalLikeCount(newCount);
    setLocalReaction(newReaction);

    reactMutation.mutate({
      postId: comment.id,
      type: newReaction,
    });
  }

  function openDeleteConfirm() {
    setShowMenu(false);
    setDeleteConfirmOpen(true);
  }

  function confirmDelete() {
    deleteMutation.mutate(comment.id, {
      onSuccess: () => {
        setDeleteConfirmOpen(false);
        toast.success('Đã xóa bình luận');
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });
  }

  const reactionId = (localReaction as PostReactionId | null) ?? null;
  const likeLabel =
    reactionId && reactionId !== 'like'
      ? REACTION_LABELS[reactionId]
      : 'Thích';

  return (
    <div
      className={cn(
        'hover:bg-muted/30 flex gap-2 px-4 py-2 transition-colors',
        isReply && 'px-0 py-1',
      )}
    >
      <div className="shrink-0 pt-1">
        <Avatar
          src={comment.author.image || null}
          name={comment.author.name}
          username={comment.author.username}
          size={isReply ? 'xs' : 'sm'}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative inline-block max-w-full">
          <div className="bg-muted/50 inline-block rounded-2xl px-3 py-2">
            <div className="mb-0.5 flex items-center gap-2">
              <span className="cursor-pointer text-sm font-semibold hover:underline">
                {comment.author.name ?? comment.author.username}
              </span>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm">{comment.content}</p>
          </div>

          {localLikeCount > 0 && (
            <div
              className="bg-card border-border absolute -bottom-1.5 right-2 flex items-center gap-0.5 rounded-full border px-1 py-0.5 shadow-sm"
              aria-label={`${localLikeCount} lượt thích`}
            >
              <ReactionFace
                id={reactionId ?? 'like'}
                size="sm"
                className="h-4 w-4 min-h-4 min-w-4"
              />
              <span className="text-foreground pr-0.5 text-[11px] font-semibold leading-none">
                {localLikeCount}
              </span>
            </div>
          )}
        </div>

        {comment.media.length > 0 && (
          <div className="mt-2 max-w-[300px]">
            <PostMediaCarousel mode="feed" postId={comment.id} items={comment.media} />
          </div>
        )}

        <div className="relative mt-1 flex items-center gap-4 px-2">
          <span className="text-muted-foreground text-xs">
            {new Date(comment.createdAt).toLocaleString('vi-VN', {
              dateStyle: 'short',
              timeStyle: 'short',
            })}
          </span>

          <div className="relative">
            {showPicker && (
              <div
                role="toolbar"
                aria-label="Chọn cảm xúc"
                className="bg-card border-border absolute bottom-full left-0 z-30 mb-2 flex items-center rounded-full border px-1.5 py-1.5 shadow-lg"
                onMouseEnter={openPicker}
                onMouseLeave={scheduleHidePicker}
              >
                <div className="flex items-center gap-0.5">
                  {COMMENT_REACTIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      aria-label={REACTION_LABELS[r]}
                      title={REACTION_LABELS[r]}
                      onClick={() => handleReaction(r)}
                      className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                        'transition-transform duration-150 motion-safe:hover:z-10 motion-safe:hover:scale-125',
                        'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                      )}
                    >
                      <ReactionFace id={r} size="md" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleLike}
              onMouseEnter={openPicker}
              onMouseLeave={scheduleHidePicker}
              className={cn(
                'text-xs font-semibold hover:underline',
                reactionId
                  ? REACTION_COLORS[reactionId]
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {likeLabel}
            </button>
          </div>

          <button
            onClick={() =>
              onReply(comment.author.username, isReply ? comment.parentId! : comment.id)
            }
            className="text-muted-foreground hover:text-foreground text-xs font-semibold hover:underline"
          >
            Trả lời
          </button>

          {isOwner ? (
            <div className="relative ml-auto shrink-0" ref={menuRef}>
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full p-1"
                aria-label="Tùy chọn bình luận"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {showMenu && (
                <div className="border-border bg-card absolute bottom-full right-0 z-20 mb-1 min-w-[10rem] rounded-xl border py-1 shadow-lg">
                  <button
                    onClick={openDeleteConfirm}
                    className="hover:bg-muted w-full px-4 py-2 text-left text-sm text-red-500 transition-colors duration-150"
                  >
                    Xóa bình luận
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {!isReply && replies.length > 0 && (
          <div className="mt-1 flex flex-col gap-1">
            {replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} onReply={onReply} isReply={true} />
            ))}
            {hasMoreReplies && (
              <button
                onClick={() => fetchReplies()}
                className="text-muted-foreground ml-9 mt-1 text-left text-xs font-semibold hover:underline"
              >
                Xem thêm trả lời...
              </button>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Xóa bình luận"
        description="Bạn có chắc chắn muốn xóa bình luận này không?"
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        confirming={deleteMutation.isPending}
        destructive
      />
    </div>
  );
}

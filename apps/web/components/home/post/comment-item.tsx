'use client';

import type { PostFeedItemDto } from '@costy/shared';
import { MoreHorizontal } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { PostMediaCarousel } from '../post-media/post-media-carousel';

import type { PostReactionId } from './reaction-face';
import { ReactionFace } from './reaction-face';

import { Avatar } from '@/components/shared/avatar';
import { useDeletePost } from '@/hooks/queries/use-delete-post';
import { usePostComments } from '@/hooks/queries/use-post-comments';
import { useReactPost } from '@/hooks/use-react-post';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

type Props = {
  comment: PostFeedItemDto;
  onReply: (username: string, commentId: string) => void;
  isReply?: boolean;
};

export function CommentItem({ comment, onReply, isReply = false }: Props) {
  const { data: session } = authClient.useSession();
  const me = session?.user;
  const isOwner = me?.id === comment.author.id;
  // TODO: isParentOwner check if needed, but Delete API handles auth anyway.

  const reactMutation = useReactPost();
  const deleteMutation = useDeletePost();

  // Lấy các replies nếu đây là comment gốc (không fetch tiếp nếu đang ở cấp độ reply để tránh sâu vô hạn)
  const {
    data: repliesData,
    hasNextPage: hasMoreReplies,
    fetchNextPage: fetchReplies,
  } = usePostComments(comment.id, 'asc', !isReply && comment.replyCount > 0);
  const replies = repliesData?.pages.flatMap((p) => p.items) || [];

  const [showPicker, setShowPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  // Local state for optimistic updates
  const [localReaction, setLocalReaction] = useState(comment.myReaction);
  const [localLikeCount, setLocalLikeCount] = useState(comment.likeCount);

  // Sync local state when props change
  useEffect(() => {
    setLocalReaction(comment.myReaction);
    setLocalLikeCount(comment.likeCount);
  }, [comment.myReaction, comment.likeCount]);

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

    // Optimistic UI update
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

    // Optimistic UI update
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

  function handleDelete() {
    if (confirm('Bạn có chắc chắn muốn xóa bình luận này?')) {
      deleteMutation.mutate(comment.id, {
        onSuccess: () => toast.success('Đã xóa bình luận'),
        onError: (err) => toast.error(err.message),
      });
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/${comment.author.username}/post/${comment.id}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Bình luận', url });
      } catch {
        // User cancelled native share dialog
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Đã sao chép liên kết');
    }
  }

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
        <div className="bg-muted/50 inline-block rounded-2xl px-3 py-2">
          <div className="mb-0.5 flex items-center gap-2">
            <span className="cursor-pointer text-sm font-semibold hover:underline">
              {comment.author.name ?? comment.author.username}
            </span>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm">{comment.content}</p>
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

          <div
            className="relative"
            onMouseEnter={() => {
              if (hideTimer) clearTimeout(hideTimer);
              setShowPicker(true);
            }}
            onMouseLeave={() => {
              hideTimer = setTimeout(() => setShowPicker(false), 300);
            }}
          >
            <button
              onClick={handleLike}
              className={cn(
                'text-xs font-semibold hover:underline',
                localReaction ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Thích {localLikeCount > 0 ? `(${localLikeCount})` : ''}
            </button>

            {showPicker && (
              <div className="bg-card absolute bottom-full left-0 z-20 mb-1 flex items-center rounded-full px-1.5 py-1.5 shadow-lg">
                {['like', 'love', 'haha', 'wow', 'sad', 'angry', 'care'].map((r) => (
                  <button
                    key={r}
                    onClick={() => handleReaction(r as PostReactionId)}
                    className="flex h-8 w-8 items-center justify-center transition-transform hover:scale-125"
                  >
                    <ReactionFace id={r as PostReactionId} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() =>
              onReply(comment.author.username, isReply ? comment.parentId! : comment.id)
            }
            className="text-muted-foreground hover:text-foreground text-xs font-semibold hover:underline"
          >
            Trả lời
          </button>

          <button
            onClick={handleShare}
            className="text-muted-foreground hover:text-foreground text-xs font-semibold hover:underline"
          >
            Chia sẻ
          </button>

          <div className="relative ml-auto shrink-0" ref={menuRef}>
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full p-1"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {showMenu && (
              <div className="border-border bg-card absolute bottom-full right-0 z-20 mb-1 min-w-[10rem] rounded-xl border py-1 shadow-lg">
                {isOwner && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleDelete();
                    }}
                    className="hover:bg-muted w-full px-4 py-2 text-left text-sm text-red-500 transition-colors duration-150"
                  >
                    Xóa bình luận
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowMenu(false);
                    handleShare();
                  }}
                  className="text-foreground hover:bg-muted w-full px-4 py-2 text-left text-sm transition-colors duration-150"
                >
                  Sao chép liên kết
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Danh sách các replies */}
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
    </div>
  );
}

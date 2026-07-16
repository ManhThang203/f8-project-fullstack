'use client';

import type { PostFeedItemDto } from '@costy/shared';
import { CornerDownRight, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner';


import type { PostReactionId } from '@/components/home/post/reactions/reaction-face';
import { ReactionFace, REACTION_COLORS, REACTION_LABELS } from '@/components/home/post/reactions/reaction-face';
import { ReactionPickerPopover } from '@/components/home/post/reactions/reaction-picker-popover';
import { PostMediaCarousel } from '@/components/home/post-media/post-media-carousel';
import { useCurrentUser } from '@/components/shared/providers/current-user-context';
import { Avatar, ConfirmDialog, RelativeTime } from '@/components/shared/ui';
import { useReactionPickerHover, useReactPost } from '@/hooks/post';
import { buildDeleteCommentInput, useDeletePost, usePostComments } from '@/hooks/queries/posts';
import { getUserFacingErrorMessage } from '@/lib/api';
import { displayTopReactions, patchTopReactionsOptimistic } from '@/lib/post';
import { cn } from '@/lib/utils';

const COMMENT_REACTIONS: PostReactionId[] = ['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'];

/** Số cấp thụt lề tối đa hiển thị; từ cấp này trở đi reply vẫn đúng cha nhưng không thụt thêm (tránh tràn màn hình). */
const MAX_INDENT_DEPTH = 4;
/** Bề rộng avatar 'xs' + khoảng cách (gap-2) mà mỗi cấp reply đóng góp vào thụt lề tự nhiên. */
const REPLY_INDENT_PX = 32;

/** Tách mention "@username" ở đầu nội dung reply để hiển thị đậm + link, giúp biết đang trả lời ai. */
function splitLeadingMention(content: string): { username: string; rest: string } | null {
  const match = content.match(/^@([a-zA-Z0-9_.]+)\s?/);
  if (!match) return null;
  return { username: match[1]!, rest: content.slice(match[0].length) };
}

type Props = {
  comment: PostFeedItemDto;
  onReply: (username: string, commentId: string) => void;
  /** Cấp lồng của comment này trong cây bình luận; 0 = comment gốc cấp 1. */
  depth?: number;
  rootPostId?: string;
  onDeleted?: (comment: PostFeedItemDto) => void;
  /** Id comment/reply đang được deep-link tới (từ URL) — component tự cuộn tới khi mount. */
  scrollTargetId?: string;
  /** Chuỗi tổ tiên (cấp 1 → target) từ API ancestry, dùng để ghim đúng nhánh vào mọi cấp dù reply nằm ở trang sau. */
  pinnedPath?: PostFeedItemDto[];
  /** Id comment cha cần tự mở rộng sau khi user vừa gửi reply. */
  expandCommentId?: string | null;
};

export function CommentItem({
  comment,
  onReply,
  depth = 0,
  rootPostId,
  onDeleted,
  scrollTargetId,
  pinnedPath,
  expandCommentId,
}: Props) {
  const isReply = depth > 0;
  const isScrollTarget = comment.id === scrollTargetId;
  const itemRef = useRef<HTMLDivElement>(null);
  const { user: me } = useCurrentUser();
  const isOwner = me?.id === comment.author.id;

  const reactMutation = useReactPost();
  const deleteMutation = useDeletePost();

  const pinnedChild = useMemo(
    () => pinnedPath?.find((p) => p.parentId === comment.id) ?? null,
    [pinnedPath, comment.id],
  );

  const [expanded, setExpanded] = useState(() => Boolean(pinnedChild));

  const isExpanded = expanded || expandCommentId === comment.id;

  /** Chỉ fetch reply khi user mở rộng hoặc nhánh nằm trên đường deep-link. */
  const shouldFetchReplies =
    (isExpanded || Boolean(pinnedChild)) &&
    (comment.replyCount > 0 || expandCommentId === comment.id);

  const {
    data: repliesData,
    hasNextPage: hasMoreReplies,
    fetchNextPage: fetchReplies,
    isLoading: isLoadingReplies,
  } = usePostComments(comment.id, 'asc', shouldFetchReplies);

  const rawReplies = useMemo(
    () => repliesData?.pages.flatMap((p) => p.items) ?? [],
    [repliesData],
  );

  /** Ghim reply trên đường deep-link và dedupe tránh trùng khi optimistic + phân trang. */
  const replies = useMemo(() => {
    const merged =
      pinnedChild && !rawReplies.some((r) => r.id === pinnedChild.id)
        ? [pinnedChild, ...rawReplies]
        : rawReplies;
    const seen = new Set<string>();
    return merged.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }, [rawReplies, pinnedChild]);

  const { showPicker, setShowPicker, openPicker, scheduleHidePicker } = useReactionPickerHover();
  const [showMenu, setShowMenu] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  /** Tự cuộn tới đúng comment/reply khi mở link deep-link (không highlight nền, chỉ cuộn). */
  useEffect(() => {
    if (!isScrollTarget) return;
    const t = setTimeout(() => {
      itemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    return () => clearTimeout(t);
  }, [isScrollTarget]);

  /** Mở nhánh khi ancestry deep-link load async hoặc sau khi user vừa gửi reply. */
  useEffect(() => {
    if (pinnedChild) setExpanded(true);
  }, [pinnedChild]);

  useEffect(() => {
    if (expandCommentId === comment.id) setExpanded(true);
  }, [expandCommentId, comment.id]);

  const [localReaction, setLocalReaction] = useState(comment.myReaction);
  const [localLikeCount, setLocalLikeCount] = useState(comment.likeCount);
  const [localTopReactions, setLocalTopReactions] = useState(comment.topReactions ?? []);

  useEffect(() => {
    setLocalReaction(comment.myReaction);
    setLocalLikeCount(comment.likeCount);
    setLocalTopReactions(comment.topReactions ?? []);
  }, [comment.myReaction, comment.likeCount, comment.topReactions]);

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
    const prevReaction = localReaction;
    const newCount = isLiked ? Math.max(0, localLikeCount - 1) : localLikeCount + 1;

    setLocalLikeCount(newCount);
    setLocalReaction(newReaction);
    setLocalTopReactions((prev) =>
      patchTopReactionsOptimistic(prev, newReaction, prevReaction, newCount),
    );

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
    setLocalTopReactions((prev) =>
      patchTopReactionsOptimistic(prev, newReaction, localReaction, newCount),
    );

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
    const input = rootPostId
      ? buildDeleteCommentInput(comment, rootPostId)
      : { postId: comment.id };

    deleteMutation.mutate(input, {
      onSuccess: () => {
        setDeleteConfirmOpen(false);
        onDeleted?.(comment);
        toast.success('Đã xóa bình luận');
      },
      onError: (err) => {
        toast.error(getUserFacingErrorMessage(err));
      },
    });
  }

  const reactionId = (localReaction as PostReactionId | null) ?? null;
  const reactionStack = displayTopReactions(localTopReactions, localLikeCount, reactionId);
  const likeLabel = reactionId && reactionId !== 'like' ? REACTION_LABELS[reactionId] : 'Thích';
  const hasReactions = localLikeCount > 0 && reactionStack.length > 0;
  const profileHref = `/${encodeURIComponent(comment.author.username)}`;
  const profileLabel = comment.author.name ?? comment.author.username;
  const leadingMention = isReply ? splitLeadingMention(comment.content) : null;

  return (
    <div
      ref={itemRef}
      className={cn(
        'hover:bg-muted/30 flex gap-2 px-4 py-2 transition-colors duration-300',
        isReply && 'px-0 py-1',
      )}
    >
      <div className="shrink-0 pt-1">
        <Link
          href={profileHref}
          prefetch={false}
          aria-label={`Xem trang cá nhân của ${profileLabel}`}
          className="focus-visible:ring-ring inline-flex rounded-full transition-opacity duration-150 hover:opacity-90 focus-visible:outline-hidden focus-visible:ring-2"
        >
          <Avatar
            as="span"
            src={comment.author.image || null}
            name={comment.author.name}
            username={comment.author.username}
            size={isReply ? 'xs' : 'sm'}
          />
        </Link>
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative inline-block max-w-full">
          <div
            className={cn('bg-muted/50 inline-block rounded-2xl px-3 py-2', hasReactions && 'pr-8')}
          >
            <div className="mb-0.5 flex items-center gap-2">
              <Link
                href={profileHref}
                prefetch={false}
                className="text-foreground focus-visible:ring-ring text-sm font-semibold hover:underline focus-visible:outline-hidden focus-visible:ring-2"
              >
                {profileLabel}
              </Link>
            </div>
            <p className="whitespace-pre-wrap wrap-break-word text-sm">
              {leadingMention ? (
                <>
                  <Link
                    href={`/${encodeURIComponent(leadingMention.username)}`}
                    prefetch={false}
                    className="text-primary font-semibold hover:underline"
                  >
                    @{leadingMention.username}
                  </Link>{' '}
                  {leadingMention.rest}
                </>
              ) : (
                comment.content
              )}
            </p>
          </div>

          {hasReactions && (
            <div
              className="bg-card border-border absolute bottom-0 right-2 z-10 flex translate-y-1/2 items-center gap-0.5 rounded-full border px-1.5 py-0.5 shadow-xs"
              aria-label={`${localLikeCount} lượt cảm xúc`}
            >
              <span className="flex items-center" aria-hidden>
                {reactionStack.map((id, index) => (
                  <span
                    key={`${id}-${index}`}
                    className={cn('relative', index > 0 && '-ml-1.5')}
                    style={{ zIndex: reactionStack.length - index }}
                  >
                    <ReactionFace id={id} size="xs" />
                  </span>
                ))}
              </span>
              <span className="text-foreground pl-0.5 text-[11px] font-semibold tabular-nums leading-none">
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

        <div
          className={cn('relative flex items-center gap-4 px-2', hasReactions ? 'mt-2' : 'mt-0.5')}
        >
          <RelativeTime
            dateTime={comment.createdAt}
            variant="post"
            className="text-muted-foreground text-xs"
          />

          <ReactionPickerPopover
            open={showPicker}
            onOpen={openPicker}
            onScheduleClose={scheduleHidePicker}
            reactions={COMMENT_REACTIONS.map((id) => ({ id, label: REACTION_LABELS[id] }))}
            onSelect={handleReaction}
          >
            <button
              onClick={handleLike}
              className={cn(
                'text-xs font-semibold hover:underline',
                reactionId
                  ? REACTION_COLORS[reactionId]
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {likeLabel}
            </button>
          </ReactionPickerPopover>

          <button
            onClick={() => onReply(comment.author.username, comment.id)}
            className="text-muted-foreground hover:text-foreground text-xs font-semibold hover:underline"
          >
            Trả lời
          </button>

          {isOwner ? (
            <div className="relative shrink-0" ref={menuRef}>
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full p-1"
                aria-label="Tùy chọn bình luận"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {showMenu && (
                <div className="border-border bg-card absolute bottom-full right-0 z-20 mb-1 min-w-40 rounded-xl border py-1 shadow-lg">
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

        {!isExpanded && comment.replyCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-muted-foreground hover:text-foreground mt-1 flex min-h-11 items-center gap-1.5 pl-1 text-left text-xs font-semibold hover:underline"
          >
            <CornerDownRight className="h-4 w-4 shrink-0" aria-hidden />
            Xem tất cả {comment.replyCount} phản hồi
          </button>
        )}

        {isExpanded && (comment.replyCount > 0 || replies.length > 0) && (
          <div className="mt-1 flex flex-col gap-1">
            {isLoadingReplies && replies.length === 0 && (
              <p className="text-muted-foreground ml-9 text-xs">Đang tải phản hồi...</p>
            )}
            {replies.map((reply) => {
              const childDepth = depth + 1;
              const cancelIndent = childDepth > MAX_INDENT_DEPTH;
              return (
                <div
                  key={reply.id}
                  style={cancelIndent ? { marginLeft: -REPLY_INDENT_PX } : undefined}
                >
                  <CommentItem
                    comment={reply}
                    onReply={onReply}
                    depth={childDepth}
                    rootPostId={rootPostId}
                    onDeleted={onDeleted}
                    scrollTargetId={scrollTargetId}
                    pinnedPath={pinnedPath}
                    expandCommentId={expandCommentId}
                  />
                </div>
              );
            })}
            {hasMoreReplies && (
              <button
                type="button"
                onClick={() => fetchReplies()}
                className="text-muted-foreground hover:text-foreground ml-9 mt-1 flex min-h-11 items-center gap-1.5 text-left text-xs font-semibold hover:underline"
              >
                <CornerDownRight className="h-4 w-4 shrink-0" aria-hidden />
                Xem thêm phản hồi
              </button>
            )}
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-muted-foreground hover:text-foreground ml-9 mt-1 flex min-h-11 items-center gap-1.5 text-left text-xs font-semibold hover:underline"
            >
              <CornerDownRight className="h-4 w-4 shrink-0" aria-hidden />
              Ẩn phản hồi
            </button>
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

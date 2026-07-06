'use client';

import type { PostFeedItemDto } from '@costy/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Image, X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
import type { Socket } from 'socket.io-client';
import { toast } from 'sonner';

import type { DraftMedia } from '../post-media/post-media-carousel';
import { PostMediaCarousel } from '../post-media/post-media-carousel';

import { CommentItem } from './comment-item';
import { CommentList } from './comment-list';
import { PostCard } from './post-card';

import { Avatar } from '@/components/shared/avatar';
import { ComposeEmojiPicker } from '@/components/shared/compose-emoji-picker';
import { Modal } from '@/components/shared/modal';
import { usePostComments } from '@/hooks/queries/use-post-comments';
import { useCommentRealtime } from '@/hooks/use-comment-realtime';
import { handleCommentEnterKey } from '@/lib/comment-input';
import { createPostWithMedia } from '@/lib/create-post';
import { applyEmojiInsert } from '@/lib/insert-text-at-cursor';
import { isImageMime, isVideoMime, validateFiles } from '@/lib/media-validation';
import {
  appendReplyToCache,
  bumpReplyCountInCommentCaches,
  insertCommentInCache,
} from '@/lib/post-cache';
import { queryKeys } from '@/lib/query-keys';
import { getAuthedSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  post: PostFeedItemDto;
  me?: { id: string; username?: string | null; name?: string | null; image?: string | null };
};

type DraftEntry = DraftMedia & { file: File };
type PostHiddenPayload = { postId: string; parentId?: string | null; rootPostId?: string | null };
let _tempCounter = 0;
function nextTempId() {
  return `draft-${++_tempCounter}`;
}

export function PostDetailModal({ open, onClose, post, me }: Props) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyingToUsername, setReplyingToUsername] = useState<string | null>(null);
  const [expandParentId, setExpandParentId] = useState<string | null>(null);
  const [focusReplyId, setFocusReplyId] = useState<string | null>(null);
  const [commentCount, setCommentCount] = useState(post.commentCount ?? post.replyCount);
  const [scrollParent, setScrollParent] = useState<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (open && scrollRef.current) setScrollParent(scrollRef.current);
  }, [open]);

  const { data, fetchNextPage, hasNextPage, isLoading, isFetchingNextPage } = usePostComments(post.id);
  const comments = useMemo(() => data?.pages.flatMap((p) => p.items) || [], [data]);

  const imageCount = drafts.filter((d) => isImageMime(d.file.type)).length;
  const videoCount = drafts.filter((d) => isVideoMime(d.file.type)).length;

  useEffect(() => {
    if (open) {
      setCommentCount(post.commentCount ?? post.replyCount);
    }
  }, [open, post.id, post.commentCount, post.replyCount]);

  useEffect(() => {
    if (!open) {
      setContent('');
      setDrafts((currentDrafts) => {
        currentDrafts.forEach((d) => {
          if (d.url.startsWith('blob:')) URL.revokeObjectURL(d.url);
        });
        return [];
      });
      setReplyingToCommentId(null);
      setReplyingToUsername(null);
      setExpandParentId(null);
      setFocusReplyId(null);
      setScrollParent(null);
    }
  }, [open]);

  const handleCountDelta = useCallback((delta: number) => {
    setCommentCount((prev) => Math.max(0, prev + delta));
  }, []);

  useCommentRealtime({
    postId: post.id,
    meId: me?.id,
    enabled: open,
    onCountDelta: handleCountDelta,
  });

  useEffect(() => {
    if (!open || !me?.id) return;

    let cancelled = false;
    let activeSocket: Socket | null = null;

    // Chỉ cập nhật khi bài/comment bị ẩn thuộc thread đang mở.
    function onPostHidden(payload: PostHiddenPayload) {
      if (payload.postId === post.id) {
        toast.error('Bài viết đã bị ẩn do vi phạm quy tắc cộng đồng.');
        onClose();
        return;
      }
      if (payload.rootPostId !== post.id && payload.parentId !== post.id) return;

      setCommentCount((prev) => Math.max(0, prev - 1));
      queryClient.invalidateQueries({ queryKey: ['posts', 'comments', post.id] });
    }

    void getAuthedSocket('/feed')
      .then((socket) => {
        if (cancelled) return;
        activeSocket = socket;
        socket.on('post:hidden', onPostHidden);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      activeSocket?.off('post:hidden', onPostHidden);
    };
  }, [open, me?.id, post.id, onClose, queryClient]);

  /** Giảm số bình luận hiển thị khi xóa comment cấp 1 của bài viết. */
  function handleCommentDeleted(_deletedComment: PostFeedItemDto) {
    setCommentCount((prev) => Math.max(0, prev - 1));
  }

  function handleFiles(files: FileList | null) {
    if (!files || busy) return;
    if (drafts.length >= 1) {
      toast.error('Bình luận chỉ được đính kèm 1 ảnh');
      return;
    }
    const incoming = Array.from(files)
      .slice(0, 1)
      .filter((file) => isImageMime(file.type));
    if (incoming.length === 0) {
      toast.error('Chỉ được chọn ảnh cho bình luận');
      return;
    }
    const { ok, errors } = validateFiles(incoming, { images: imageCount, videos: videoCount });
    if (errors.length > 0) {
      toast.error(errors[0]!);
      return;
    }
    const newDrafts: DraftEntry[] = ok.map((file) => ({
      tempId: nextTempId(),
      url: URL.createObjectURL(file),
      file,
      mediaType: 'image',
      progress: 0,
      status: 'done' as const,
    }));
    setDrafts((prev) => prev.concat(newDrafts));
  }

  function removeDraft(tempId: string) {
    setDrafts((prev) => {
      const target = prev.find((d) => d.tempId === tempId);
      if (target?.url.startsWith('blob:')) URL.revokeObjectURL(target.url);
      return prev.filter((d) => d.tempId !== tempId);
    });
  }

  function handleEmojiSelect(emoji: string) {
    applyEmojiInsert(textareaRef.current, content, emoji, setContent);
  }

  async function handleSubmit() {
    const text = content.trim();
    if (busy || (!text && drafts.length === 0)) return;

    setBusy(true);
    const files = drafts.map((d) => d.file);
    const targetParentId = replyingToCommentId;

    /** Ghép mention vào đầu nội dung để server parseMentions vẫn nhận được. */
    const finalContent = replyingToUsername && !text.startsWith(`@${replyingToUsername}`)
      ? `@${replyingToUsername} ${text}`
      : text;

    const result = await createPostWithMedia({
      content: finalContent,
      files,
      parentId: targetParentId ?? post.id,
      onUploadProgress: (fileIndex, percent) => {
        setDrafts((prev) =>
          prev.map((d, i) =>
            i === fileIndex ? { ...d, status: 'uploading' as const, progress: percent } : d,
          ),
        );
      },
    });

    setBusy(false);
    if (!result.ok) {
      setDrafts((prev) => prev.map((d) => ({ ...d, status: 'done' as const, progress: 100 })));
      toast.error(result.message);
      return;
    }

    setContent('');
    setDrafts([]);
    setReplyingToCommentId(null);
    setReplyingToUsername(null);
    toast.success('Đã gửi bình luận');

    setCommentCount((prev) => prev + 1);

    if (targetParentId) {
      appendReplyToCache(queryClient, targetParentId, result.post);
      bumpReplyCountInCommentCaches(queryClient, targetParentId, 1);
      setExpandParentId(targetParentId);
      setFocusReplyId(result.post.id);
    } else {
      insertCommentInCache(queryClient, post.id, result.post);
    }

    queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed });
  }

  /** Ghi đè chip trả lời mỗi lần bấm Trả lời — không cộng dồn vào textarea. */
  function handleReplyTo(username: string, commentId: string) {
    setReplyingToCommentId(commentId);
    setReplyingToUsername(username);
    textareaRef.current?.focus();
  }

  /** Hủy chế độ trả lời, comment sẽ gửi về bài viết gốc. */
  function cancelReply() {
    setReplyingToCommentId(null);
    setReplyingToUsername(null);
  }

  return (
    <Modal open={open} onClose={onClose} dismissOnEsc={!busy} dismissOnBackdrop={!busy}>
      <Modal.Backdrop />
      <Modal.Panel
        from="bottom"
        size="lg"
        className={cn(
          'max-h-[min(95dvh,100%)] sm:max-h-[min(90dvh,100%)]',
          'w-full rounded-t-2xl sm:max-w-[600px] sm:rounded-2xl',
          'bg-background flex min-h-0 flex-col',
        )}
      >
        <Modal.Header
          title={`Bài viết của ${post.author.name ?? post.author.username}`}
          closeDisabled={busy}
        />

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="pointer-events-none">
            {/* Display post but disable interaction inside slightly or just render it */}
          </div>
          <PostCard
            post={post}
            onDismiss={() => {}}
            hideDismiss
            variant="embedded"
            onCommentClick={() => textareaRef.current?.focus()}
            replyCountOverride={commentCount}
            commentCount={commentCount}
          />

          <div className="border-border mt-2 border-t" />

          <div className="pb-4 py-2">
            {isLoading && (
              <p className="text-muted-foreground py-4 text-center text-sm">
                Đang tải bình luận...
              </p>
            )}
            {!isLoading && comments.length === 0 && (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
              </p>
            )}
            {scrollParent && comments.length > 0 ? (
              <CommentList
                customScrollParent={scrollParent}
                comments={comments}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                onEndReached={() => fetchNextPage()}
                renderComment={(comment) => (
                  <CommentItem
                    comment={comment}
                    onReply={handleReplyTo}
                    rootPostId={post.id}
                    onDeleted={handleCommentDeleted}
                    scrollTargetId={focusReplyId ?? undefined}
                    expandCommentId={expandParentId}
                  />
                )}
              />
            ) : null}
          </div>
        </div>

        {/* Comment Input Area */}
        <div className="border-border bg-card relative z-30 shrink-0 border-t p-3 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
          <div className="flex gap-3">
            <Avatar
              src={me?.image || null}
              name={me?.name}
              username={me?.username}
              size="sm"
              className="mt-1"
            />
            <div className="bg-muted/50 min-w-0 flex-1 rounded-2xl p-3">
              {replyingToUsername && (
                <div className="mb-2 flex items-center gap-1.5">
                  <span className="text-muted-foreground text-xs">
                    Đang trả lời{' '}
                    <span className="text-primary font-semibold">@{replyingToUsername}</span>
                  </span>
                  <button
                    type="button"
                    onClick={cancelReply}
                    aria-label="Hủy trả lời"
                    className="text-muted-foreground hover:text-foreground rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => handleCommentEnterKey(e, () => void handleSubmit())}
                placeholder={replyingToUsername ? `Trả lời @${replyingToUsername}...` : 'Viết bình luận...'}
                maxLength={2000}
                className="placeholder:text-muted-foreground w-full resize-none bg-transparent text-sm outline-none"
                rows={drafts.length > 0 ? 2 : 1}
                disabled={busy}
              />

              {drafts.length > 0 && (
                <div className="mt-2">
                  <PostMediaCarousel
                    mode="editable"
                    compact
                    items={drafts}
                    onRemove={(id) => !busy && removeDraft(id)}
                  />
                </div>
              )}

              <div className="border-border/50 mt-2 flex items-center justify-between border-t pt-2">
                <div className="flex items-center gap-1">
                  <label
                    className={cn(
                      'hover:bg-muted text-muted-foreground rounded-full p-1.5 transition-colors',
                      drafts.length >= 1 ? 'pointer-events-none opacity-40' : 'cursor-pointer',
                    )}
                  >
                    <Image className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      multiple={false}
                      className="sr-only"
                      onChange={(e) => handleFiles(e.target.files)}
                      onClick={(e) => {
                        (e.currentTarget as HTMLInputElement).value = '';
                      }}
                      disabled={busy || drafts.length >= 1}
                    />
                  </label>
                  <ComposeEmojiPicker
                    onSelect={handleEmojiSelect}
                    size="sm"
                    disabled={busy}
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={busy || (!content.trim() && drafts.length === 0)}
                  className="bg-primary text-primary-foreground rounded-full px-4 py-1.5 text-xs font-semibold transition-opacity disabled:opacity-50"
                >
                  {busy ? 'Đang gửi...' : 'Gửi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal.Panel>
    </Modal>
  );
}

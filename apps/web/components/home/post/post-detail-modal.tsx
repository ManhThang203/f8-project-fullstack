'use client';

import type { PostFeedItemDto } from '@costy/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import type { Socket } from 'socket.io-client';
import { toast } from 'sonner';

import type { DraftMedia } from '../post-media/post-media-carousel';
import { PostMediaCarousel } from '../post-media/post-media-carousel';

import { CommentItem } from './comment-item';
import { PostCard } from './post-card';

import { Avatar } from '@/components/shared/avatar';
import { ComposeEmojiPicker } from '@/components/shared/compose-emoji-picker';
import { Modal } from '@/components/shared/modal';
import { usePostComments } from '@/hooks/queries/use-post-comments';
import { useCommentRealtime } from '@/hooks/use-comment-realtime';
import { createPostWithMedia } from '@/lib/create-post';
import { handleCommentEnterKey } from '@/lib/comment-input';
import { applyEmojiInsert } from '@/lib/insert-text-at-cursor';
import { isImageMime, isVideoMime, validateFiles } from '@/lib/media-validation';
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
let _tempCounter = 0;
function nextTempId() {
  return `draft-${++_tempCounter}`;
}

export function PostDetailModal({ open, onClose, post, me }: Props) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyCount, setReplyCount] = useState(post.replyCount);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data, fetchNextPage, hasNextPage, isLoading } = usePostComments(post.id);
  const comments = useMemo(() => data?.pages.flatMap((p) => p.items) || [], [data]);

  const imageCount = drafts.filter((d) => isImageMime(d.file.type)).length;
  const videoCount = drafts.filter((d) => isVideoMime(d.file.type)).length;

  useEffect(() => {
    if (open) {
      setReplyCount(post.replyCount);
    }
  }, [open, post.id, post.replyCount]);

  useEffect(() => {
    if (!open) {
      setContent('');
      drafts.forEach((d) => {
        if (d.url.startsWith('blob:')) URL.revokeObjectURL(d.url);
      });
      setDrafts([]);
      setError(null);
      setReplyingToCommentId(null);
    }
  }, [open]);

  const handleCountDelta = useCallback((delta: number) => {
    setReplyCount((prev) => Math.max(0, prev + delta));
  }, []);

  useCommentRealtime({
    postId: post.id,
    meId: me?.id,
    enabled: open,
    onCountDelta: handleCountDelta,
  });

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let activeSocket: Socket | null = null;

    function onPostHidden(payload: { postId: string; parentId?: string | null }) {
      if (payload.postId === post.id) {
        toast.error('Bài viết đã bị ẩn do vi phạm quy tắc cộng đồng.');
        onClose();
        return;
      }
      if (payload.parentId === post.id) {
        setReplyCount((prev) => Math.max(0, prev - 1));
      }
      queryClient.invalidateQueries({ queryKey: ['posts', 'comments', post.id] });
    }

    void getAuthedSocket('/feed').then((socket) => {
      if (cancelled) return;
      activeSocket = socket;
      socket.on('post:hidden', onPostHidden);
    });

    return () => {
      cancelled = true;
      activeSocket?.off('post:hidden', onPostHidden);
    };
  }, [open, post.id, onClose, queryClient]);

  /** Giảm số bình luận hiển thị khi xóa comment cấp 1 của bài viết. */
  function handleCommentDeleted(deletedComment: PostFeedItemDto) {
    if (deletedComment.parentId === post.id) {
      setReplyCount((prev) => Math.max(0, prev - 1));
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || busy) return;
    if (drafts.length >= 1) {
      setError('Bình luận chỉ được đính kèm 1 ảnh');
      return;
    }
    const incoming = Array.from(files)
      .slice(0, 1)
      .filter((file) => isImageMime(file.type));
    if (incoming.length === 0) {
      setError('Chỉ được chọn ảnh cho bình luận');
      return;
    }
    const { ok, errors } = validateFiles(incoming, { images: imageCount, videos: videoCount });
    if (errors.length > 0) {
      setError(errors[0]!);
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
    setError(null);
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

    setError(null);
    setBusy(true);
    const files = drafts.map((d) => d.file);

    const result = await createPostWithMedia({
      content: text,
      files,
      parentId: replyingToCommentId ?? post.id,
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
      setError(result.message);
      toast.error(result.message);
      return;
    }

    setContent('');
    setDrafts([]);
    toast.success('Đã gửi bình luận');

    if (!replyingToCommentId) {
      setReplyCount((prev) => prev + 1);
    }

    // Invalidate root comments
    queryClient.invalidateQueries({ queryKey: ['posts', 'comments', post.id] });

    // Invalidate nested comments if replied to a specific comment
    if (replyingToCommentId) {
      queryClient.invalidateQueries({ queryKey: ['posts', 'comments', replyingToCommentId] });
      setReplyingToCommentId(null);
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed });
  }

  function handleReplyTo(username: string, commentId: string) {
    setContent((prev) => (prev ? `${prev} @${username} ` : `@${username} `));
    setReplyingToCommentId(commentId);
    textareaRef.current?.focus();
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

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="pointer-events-none">
            {/* Display post but disable interaction inside slightly or just render it */}
          </div>
          <PostCard
            post={post}
            onDismiss={() => {}}
            hideDismiss
            onCommentClick={() => textareaRef.current?.focus()}
            replyCountOverride={replyCount}
          />

          <div className="border-border mt-2 border-t" />

          <div className="py-2">
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
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onReply={handleReplyTo}
                rootPostId={post.id}
                onDeleted={handleCommentDeleted}
              />
            ))}
            {hasNextPage && (
              <button
                onClick={() => fetchNextPage()}
                className="text-primary w-full py-3 text-center text-sm hover:underline"
              >
                Xem thêm bình luận
              </button>
            )}
          </div>
        </div>

        {/* Comment Input Area */}
        <div className="border-border bg-card border-t p-3 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
          <div className="flex gap-3">
            <Avatar
              src={me?.image || null}
              name={me?.name}
              username={me?.username}
              size="sm"
              className="mt-1"
            />
            <div className="bg-muted/50 min-w-0 flex-1 rounded-2xl p-3">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (e.target.value.trim() === '') setReplyingToCommentId(null);
                }}
                onKeyDown={(e) => handleCommentEnterKey(e, () => void handleSubmit())}
                placeholder="Viết bình luận..."
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

              {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

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

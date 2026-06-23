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
import { CommentList } from './comment-list';
import { PostCard } from './post-card';

import { Avatar } from '@/components/shared/avatar';
import { ComposeEmojiPicker } from '@/components/shared/compose-emoji-picker';
import { usePost } from '@/hooks/queries/use-post';
import { usePostComments } from '@/hooks/queries/use-post-comments';
import { useCommentRealtime } from '@/hooks/use-comment-realtime';
import { authClient } from '@/lib/auth-client';
import { handleCommentEnterKey } from '@/lib/comment-input';
import { createPostWithMedia } from '@/lib/create-post';
import { applyEmojiInsert } from '@/lib/insert-text-at-cursor';
import { isImageMime, isVideoMime, validateFiles } from '@/lib/media-validation';
import { queryKeys } from '@/lib/query-keys';
import { getAuthedSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';

type Props = {
  post: PostFeedItemDto;
  highlightCommentId?: string;
};

type DraftEntry = DraftMedia & { file: File };
type PostHiddenPayload = { postId: string; parentId?: string | null; rootPostId?: string | null };
let _tempCounter = 0;
function nextTempId() {
  return `draft-${++_tempCounter}`;
}

export function PostDetailView({ post, highlightCommentId }: Props) {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const me = session?.user;
  const [content, setContent] = useState('');
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [commentCount, setCommentCount] = useState(post.commentCount ?? post.replyCount);
  const [scrollParent, setScrollParent] = useState<HTMLElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data, fetchNextPage, hasNextPage, isLoading, isFetchingNextPage } = usePostComments(post.id);
  const comments = useMemo(() => data?.pages.flatMap((p) => p.items) || [], [data]);
  const visibleComments = useMemo(
    () => comments.filter((comment) => comment.id !== highlightCommentId),
    [comments, highlightCommentId],
  );

  const { data: highlightedComment, isLoading: isHighlightLoading } = usePost(
    highlightCommentId || null,
  );

  const imageCount = drafts.filter((d) => isImageMime(d.file.type)).length;
  const videoCount = drafts.filter((d) => isVideoMime(d.file.type)).length;

  useEffect(() => {
    setCommentCount(post.commentCount ?? post.replyCount);
  }, [post.id, post.commentCount, post.replyCount]);

  useEffect(() => {
    return () => {
      drafts.forEach((d) => {
        if (d.url.startsWith('blob:')) URL.revokeObjectURL(d.url);
      });
    };
  }, [drafts]);

  const handleCountDelta = useCallback((delta: number) => {
    setCommentCount((prev) => Math.max(0, prev + delta));
  }, []);

  useCommentRealtime({ postId: post.id, meId: me?.id, onCountDelta: handleCountDelta });

  useEffect(() => {
    let cancelled = false;
    let activeSocket: Socket | null = null;

    // Chỉ cập nhật khi bài/comment bị ẩn thuộc thread đang mở.
    function onPostHidden(payload: PostHiddenPayload) {
      if (payload.postId === post.id) {
        toast.error('Bài viết đã bị ẩn do vi phạm quy tắc cộng đồng.');
        return;
      }
      if (payload.rootPostId !== post.id && payload.parentId !== post.id) return;

      setCommentCount((prev) => Math.max(0, prev - 1));
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
  }, [post.id, queryClient]);

  /** Giảm tổng số bình luận khi xóa bất kỳ comment nào trong thread. */
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
      toast.error(result.message);
      return;
    }

    setContent('');
    setDrafts([]);
    toast.success('Đã gửi bình luận');

    // Mọi comment mới (cấp nào) đều tăng tổng commentCount của root post
    setCommentCount((prev) => prev + 1);

    queryClient.invalidateQueries({ queryKey: ['posts', 'comments', post.id] });

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
    <div className="bg-background relative flex h-full w-full flex-col">
      <div ref={setScrollParent} className="min-h-0 flex-1 overflow-y-auto">
        <PostCard
          post={post}
          onDismiss={() => {}}
          onCommentClick={() => textareaRef.current?.focus()}
          replyCountOverride={commentCount}
          commentCount={commentCount}
        />

        <div className="border-border mt-2 border-t" />

        <div className="py-2">
          {highlightCommentId && (
            <div className="mb-2">
              <div className="bg-primary/5 border-primary mb-2 border-l-4 pb-2 pt-2 shadow-sm">
                <p className="text-primary mb-2 px-4 text-[11px] font-bold uppercase tracking-wider">
                  Bình luận được gắn thẻ
                </p>
                {isHighlightLoading ? (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    Đang tải bình luận...
                  </p>
                ) : highlightedComment ? (
                  <CommentItem comment={highlightedComment} onReply={handleReplyTo} rootPostId={post.id} onDeleted={handleCommentDeleted} />
                ) : (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    Không tìm thấy bình luận
                  </p>
                )}
              </div>
              <div className="border-border/50 mx-4 border-t" />
            </div>
          )}

          {isLoading && (
            <p className="text-muted-foreground py-4 text-center text-sm">Đang tải bình luận...</p>
          )}
          {!isLoading && comments.length === 0 && !highlightCommentId && (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
            </p>
          )}
          {visibleComments.length > 0 ? (
            <CommentList
              customScrollParent={scrollParent}
              comments={visibleComments}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onEndReached={() => fetchNextPage()}
              renderComment={(comment) => (
                <CommentItem
                  comment={comment}
                  onReply={handleReplyTo}
                  rootPostId={post.id}
                  onDeleted={handleCommentDeleted}
                />
              )}
            />
          ) : null}
        </div>
      </div>

      {/* Comment Input Area */}
      <div className="border-border bg-card sticky bottom-0 z-10 border-t p-3 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
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
    </div>
  );
}

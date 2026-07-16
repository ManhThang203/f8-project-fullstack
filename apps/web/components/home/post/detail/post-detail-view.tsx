'use client';

import type { PostFeedItemDto } from '@costy/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Image, X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
import type { Socket } from 'socket.io-client';
import { toast } from 'sonner';

import { PostCard } from '@/components/home/post/card/post-card';
import { CommentItem } from '@/components/home/post/comments/comment-item';
import { CommentList } from '@/components/home/post/comments/comment-list';
import type { DraftMedia } from '@/components/home/post-media/post-media-carousel';
import { PostMediaCarousel } from '@/components/home/post-media/post-media-carousel';
import { ComposeEmojiPicker } from '@/components/shared/compose-emoji-picker';
import { Avatar } from '@/components/shared/ui';
import { useCommentRealtime } from '@/hooks/post';
import { usePostAncestry, usePostComments } from '@/hooks/queries/posts';
import { createPostWithMedia, getUserFacingErrorMessage } from '@/lib/api';
import { authClient } from '@/lib/auth';
import { applyEmojiInsert, handleCommentEnterKey } from '@/lib/emoji';
import { isImageMime, isVideoMime, validateFiles } from '@/lib/post';
import {
  appendReplyToCache,
  bumpReplyCountInCommentCaches,
  insertCommentInCache,
  queryKeys,
} from '@/lib/query';
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
  const [replyingToUsername, setReplyingToUsername] = useState<string | null>(null);
  const [expandParentId, setExpandParentId] = useState<string | null>(null);
  const [focusReplyId, setFocusReplyId] = useState<string | null>(null);
  const [commentCount, setCommentCount] = useState(post.commentCount ?? post.replyCount);
  const [scrollParent, setScrollParent] = useState<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (scrollRef.current) setScrollParent(scrollRef.current);
  }, []);

  const { data, fetchNextPage, hasNextPage, isLoading, isFetchingNextPage } = usePostComments(post.id);
  const comments = useMemo(() => data?.pages.flatMap((p) => p.items) || [], [data]);

  // Chuỗi tổ tiên (cấp 1 → chính comment được deep-link) để ghim đúng nhánh vào danh sách dù nằm sâu nhiều cấp.
  const { data: pinnedPath } = usePostAncestry(highlightCommentId || null);
  const pinnedRootChild = useMemo(
    () => pinnedPath?.find((p) => p.parentId === post.id) ?? null,
    [pinnedPath, post.id],
  );

  /** Ghép comment cấp 1 nằm trên đường tới target lên đầu danh sách, loại trùng nếu đã có. */
  const displayComments = useMemo(() => {
    if (!pinnedRootChild) return comments;
    const alreadyInList = comments.some((c) => c.id === pinnedRootChild.id);
    if (alreadyInList) return comments;
    return [pinnedRootChild, ...comments];
  }, [pinnedRootChild, comments]);

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
    if (!me?.id) return;

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
  }, [me?.id, post.id, queryClient]);

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
      toast.error(getUserFacingErrorMessage(result.message, 'Không gửi được bình luận'));
      return;
    }

    setContent('');
    setDrafts([]);
    setReplyingToCommentId(null);
    setReplyingToUsername(null);
    toast.success('Đã gửi bình luận');

    // Mọi comment mới (cấp nào) đều tăng tổng commentCount của root post
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
    <div className="bg-background relative flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <PostCard
          post={post}
          onDismiss={() => {}}
          hideDismiss
          variant="embedded"
          onCommentClick={() => textareaRef.current?.focus()}
          replyCountOverride={commentCount}
          commentCount={commentCount}
        />

        <div className="border-border mt-4 border-t" />

        <div className="pb-4 py-2">
          {isLoading && (
            <p className="text-muted-foreground py-4 text-center text-sm">Đang tải bình luận...</p>
          )}
          {!isLoading && displayComments.length === 0 && (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
            </p>
          )}
          {scrollParent && displayComments.length > 0 ? (
            <CommentList
              customScrollParent={scrollParent}
              comments={displayComments}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onEndReached={() => fetchNextPage()}
              renderComment={(comment) => (
                <CommentItem
                  comment={comment}
                  onReply={handleReplyTo}
                  rootPostId={post.id}
                  onDeleted={handleCommentDeleted}
                  scrollTargetId={focusReplyId ?? highlightCommentId}
                  pinnedPath={pinnedPath}
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
              className="placeholder:text-muted-foreground w-full resize-none bg-transparent text-sm outline-hidden"
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

'use client';

import type { PostFeedItemDto } from '@costy/shared';
import { Image, MoreHorizontal, Smile, Sticker, UserPlus, MapPin } from 'lucide-react';
import { useEffect, useRef, useState, useMemo } from 'react';
import { toast } from 'sonner';

import { Avatar } from '@/components/shared/avatar';
import { IconButton } from '@/components/shared/icon-button';
import { createPostWithMedia } from '@/lib/create-post';
import { ACCEPT_MEDIA, isImageMime, isVideoMime, validateFiles } from '@/lib/media-validation';
import { cn } from '@/lib/utils';
import { usePostComments } from '@/hooks/queries/use-post-comments';
import { usePost } from '@/hooks/queries/use-post';
import { CommentItem } from './comment-item';
import { PostCard } from './post-card';
import { PostMediaCarousel, DraftMedia } from '../post-media/post-media-carousel';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { authClient } from '@/lib/auth-client';

type Props = {
  post: PostFeedItemDto;
  highlightCommentId?: string;
};

type DraftEntry = DraftMedia & { file: File };
let _tempCounter = 0;
function nextTempId() { return `draft-${++_tempCounter}`; }

export function PostDetailView({ post, highlightCommentId }: Props) {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const me = session?.user;
  const [content, setContent] = useState('');
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, fetchNextPage, hasNextPage, isLoading } = usePostComments(post.id);
  const comments = useMemo(() => data?.pages.flatMap(p => p.items) || [], [data]);

  const { data: highlightedComment, isLoading: isHighlightLoading } = usePost(highlightCommentId || null);

  const imageCount = drafts.filter((d) => isImageMime(d.file.type)).length;
  const videoCount = drafts.filter((d) => isVideoMime(d.file.type)).length;

  useEffect(() => {
    return () => {
      drafts.forEach(d => { if (d.url.startsWith('blob:')) URL.revokeObjectURL(d.url); });
    };
  }, []);

  function handleFiles(files: FileList | null) {
    if (!files || busy) return;
    const incoming = Array.from(files);
    const { ok, errors } = validateFiles(incoming, { images: imageCount, videos: videoCount });
    if (errors.length > 0) {
      setError(errors[0]!);
      return;
    }
    const newDrafts: DraftEntry[] = ok.map((file) => ({
      tempId: nextTempId(),
      url: URL.createObjectURL(file),
      file,
      mediaType: isVideoMime(file.type) ? 'video' : 'image',
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
        setDrafts((prev) => prev.map((d, i) => i === fileIndex ? { ...d, status: 'uploading' as const, progress: percent } : d));
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
    <div className="flex flex-col h-full bg-background relative w-full">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <PostCard post={post} onDismiss={() => {}} onCommentClick={() => textareaRef.current?.focus()} />

        <div className="border-t border-border mt-2" />
        
        <div className="py-2">
          {highlightCommentId && (
            <div className="mb-2">
              <div className="bg-primary/5 border-l-4 border-primary pb-2 pt-2 mb-2 shadow-sm">
                <p className="text-[11px] uppercase tracking-wider text-primary font-bold px-4 mb-2">Bình luận được gắn thẻ</p>
                {isHighlightLoading ? (
                  <p className="text-center text-sm text-muted-foreground py-4">Đang tải bình luận...</p>
                ) : highlightedComment ? (
                  <CommentItem comment={highlightedComment} onReply={handleReplyTo} />
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-4">Không tìm thấy bình luận</p>
                )}
              </div>
              <div className="border-t border-border/50 mx-4" />
            </div>
          )}

          {isLoading && <p className="text-center text-sm text-muted-foreground py-4">Đang tải bình luận...</p>}
          {!isLoading && comments.length === 0 && !highlightCommentId && (
            <p className="text-center text-sm text-muted-foreground py-8">Chưa có bình luận nào. Hãy là người đầu tiên bình luận!</p>
          )}
          {comments.map((comment) => (
            comment.id === highlightCommentId ? null : (
              <CommentItem key={comment.id} comment={comment} onReply={handleReplyTo} />
            )
          ))}
          {hasNextPage && (
            <button onClick={() => fetchNextPage()} className="w-full text-center text-sm text-primary py-3 hover:underline">
              Xem thêm bình luận
            </button>
          )}
        </div>
      </div>

      {/* Comment Input Area */}
      <div className="border-t border-border bg-card p-3 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] sticky bottom-0 z-10">
        <div className="flex gap-3">
          <Avatar src={me?.image || null} name={me?.name} username={me?.username} size="sm" className="mt-1" />
          <div className="flex-1 min-w-0 bg-muted/50 rounded-2xl p-3">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (e.target.value.trim() === '') setReplyingToCommentId(null);
              }}
              placeholder="Viết bình luận..."
              className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              rows={drafts.length > 0 ? 2 : 1}
              disabled={busy}
            />
            
            {drafts.length > 0 && (
              <div className="mt-2">
                <PostMediaCarousel mode="editable" items={drafts} onRemove={(id) => !busy && removeDraft(id)} />
              </div>
            )}

            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
              <div className="flex items-center gap-1">
                <label className="cursor-pointer p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors">
                  <Image className="h-4 w-4" />
                  <input type="file" accept={ACCEPT_MEDIA} multiple={videoCount === 0} className="sr-only" onChange={(e) => handleFiles(e.target.files)} onClick={(e) => { (e.currentTarget as HTMLInputElement).value = ''; }} disabled={busy} />
                </label>
                <IconButton shape="circle" size="sm" disabled={busy}><Sticker className="h-4 w-4 text-muted-foreground" /></IconButton>
              </div>
              <button
                onClick={handleSubmit}
                disabled={busy || (!content.trim() && drafts.length === 0)}
                className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-1.5 rounded-full disabled:opacity-50 transition-opacity"
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

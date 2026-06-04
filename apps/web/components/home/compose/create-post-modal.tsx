'use client';

import type { PostFeedItemDto } from '@costy/shared';
import { Image, MapPin, MoreHorizontal, Smile, Sticker, UserPlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { DraftMedia } from '../post-media/post-media-carousel';
import { PostMediaCarousel } from '../post-media/post-media-carousel';

import { Avatar } from '@/components/shared/avatar';
import { IconButton } from '@/components/shared/icon-button';
import { Modal } from '@/components/shared/modal';
import { createPostWithMedia } from '@/lib/create-post';
import {
  ACCEPT_MEDIA,
  isImageMime,
  isVideoMime,
  validateFiles,
} from '@/lib/media-validation';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  autoOpenFilePicker?: boolean;
  username?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  parentPost?: PostFeedItemDto;
  onPosted: (post: PostFeedItemDto) => void;
};

type ComposePhase = 'idle' | 'uploading' | 'saving';

type DraftEntry = DraftMedia & { file: File };

let _tempCounter = 0;
function nextTempId() {
  return `draft-${++_tempCounter}`;
}

export function CreatePostModal({
  open,
  onClose,
  autoOpenFilePicker,
  username,
  name,
  avatarUrl,
  parentPost,
  onPosted,
}: Props) {
  const [content, setContent] = useState('');
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [phase, setPhase] = useState<ComposePhase>('idle');
  const [uploadLabel, setUploadLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayName = name ?? username ?? 'Bạn';
  const placeholder = parentPost ? `Trả lời ${parentPost.author.name ?? parentPost.author.username}...` : `${displayName} ơi, bạn đang nghĩ gì thế?`;

  const imageCount = drafts.filter((d) => isImageMime(d.file.type)).length;
  const videoCount = drafts.filter((d) => isVideoMime(d.file.type)).length;

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      textareaRef.current?.focus();
      if (autoOpenFilePicker) fileInputRef.current?.click();
    }, 80);
    return () => clearTimeout(timer);
  }, [open, autoOpenFilePicker]);

  // Reset state khi modal đóng
  useEffect(() => {
    if (!open) {
      setContent('');
      for (const d of drafts) {
        if (d.url.startsWith('blob:')) URL.revokeObjectURL(d.url);
      }
      setDrafts([]);
      setError(null);
      setPhase('idle');
      setUploadLabel(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when modal closes
  }, [open]);

  function handleFiles(files: FileList | null) {
    if (!files || phase !== 'idle') return;
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
    if (phase !== 'idle') return;
    if (!text && drafts.length === 0) return;

    setError(null);
    setPhase('uploading');
    const files = drafts.map((d) => d.file);

    const result = await createPostWithMedia({
      content: text,
      files,
      parentId: parentPost?.id,
      onUploadProgress: (fileIndex, percent, fileName) => {
        setUploadLabel(fileName);
        setDrafts((prev) =>
          prev.map((d, i) =>
            i === fileIndex ? { ...d, status: 'uploading' as const, progress: percent } : d,
          ),
        );
      },
    });

    if (!result.ok) {
      setPhase('idle');
      setUploadLabel(null);
      setDrafts((prev) => prev.map((d) => ({ ...d, status: 'done' as const, progress: 100 })));
      setError(result.message);
      toast.error(result.message);
      return;
    }

    setPhase('saving');
    onPosted(result.post);
    toast.success('Đã đăng bài');
    onClose();
  }

  const busy = phase !== 'idle';
  const canPost = !busy && (content.trim().length > 0 || drafts.length > 0);

  const submitLabel =
    phase === 'uploading'
      ? uploadLabel
        ? `Đang tải ${uploadLabel}…`
        : 'Đang tải lên…'
      : phase === 'saving'
        ? 'Đang đăng…'
        : 'Đăng';

  return (
    <Modal open={open} onClose={onClose} dismissOnEsc={!busy} dismissOnBackdrop={!busy}>
      <Modal.Backdrop />
      <Modal.Panel
        from="bottom"
        size="md"
        className={cn(
          'max-h-[min(92dvh,100%)] sm:max-h-[min(90dvh,100%)]',
          'w-full rounded-t-2xl sm:max-w-[480px] sm:rounded-2xl',
          'pb-[max(0px,env(safe-area-inset-bottom))]',
          'flex min-h-0 flex-col',
        )}
      >
        <Modal.Header title={parentPost ? "Trả lời bình luận" : "Tạo bài viết"} closeDisabled={busy} />

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {parentPost && (
            <div className="mb-4 relative border-l-2 border-border ml-5 pl-4">
              <div className="absolute -left-[21px] top-0 bg-background">
                <Avatar src={parentPost.author.image || null} name={parentPost.author.name} username={parentPost.author.username} size="sm" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{parentPost.author.name ?? parentPost.author.username}</span>
                <span className="text-muted-foreground text-sm">@{parentPost.author.username}</span>
              </div>
              <p className="text-sm text-foreground line-clamp-3 whitespace-pre-wrap">{parentPost.content}</p>
            </div>
          )}

          <div className="mb-4 flex items-center gap-3">
            <Avatar as="span" src={avatarUrl} name={name} username={username} size="md" />
            <div className="flex flex-col">
              <span className="text-foreground text-sm font-semibold">{displayName}</span>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            maxLength={2000}
            rows={3}
            disabled={busy}
            className={cn(
              'text-foreground w-full resize-none bg-transparent text-sm leading-relaxed',
              'placeholder:text-muted-foreground outline-none',
              'disabled:opacity-60',
            )}
          />

          {drafts.length > 0 && (
            <PostMediaCarousel
              mode="editable"
              items={drafts}
              onRemove={(id) => {
                if (!busy) removeDraft(id);
              }}
            />
          )}

          {error && (
            <p className="mt-3 text-sm text-red-500 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="border-border shrink-0 border-t px-4 py-3">
          <div className="border-border mb-3 flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 sm:px-4">
            <span className="text-muted-foreground hidden text-sm sm:inline">
              Thêm vào bài viết của bạn
            </span>
            <span className="text-muted-foreground text-sm sm:hidden">Thêm</span>
            <div className="-mr-1 flex shrink-0 items-center gap-0.5 overflow-x-auto sm:gap-1">
              <label
                htmlFor="modal-file-input"
                aria-label="Thêm ảnh hoặc video"
                className={cn(
                  'flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full',
                  'text-muted-foreground hover:bg-muted transition-colors',
                  busy && 'pointer-events-none opacity-40',
                )}
              >
                <Image className="h-5 w-5 text-[hsl(145,60%,50%)]" aria-hidden />
              </label>
              <input
                ref={fileInputRef}
                id="modal-file-input"
                type="file"
                accept={ACCEPT_MEDIA}
                multiple={videoCount === 0}
                className="sr-only"
                disabled={busy}
                onChange={(e) => handleFiles(e.target.files)}
                onClick={(e) => {
                  (e.currentTarget as HTMLInputElement).value = '';
                }}
              />
              <IconButton shape="circle" disabled={busy} aria-label="Tag người khác">
                <UserPlus className="h-5 w-5" aria-hidden />
              </IconButton>
              <IconButton shape="circle" disabled={busy} aria-label="Cảm xúc">
                <Smile className="h-5 w-5 text-[hsl(40,90%,60%)]" aria-hidden />
              </IconButton>
              <IconButton shape="circle" disabled={busy} aria-label="Vị trí">
                <MapPin className="h-5 w-5" aria-hidden />
              </IconButton>
              <IconButton shape="circle" disabled={busy} aria-label="GIF">
                <Sticker className="h-5 w-5" aria-hidden />
              </IconButton>
              <IconButton shape="circle" disabled={busy} aria-label="Thêm">
                <MoreHorizontal className="h-5 w-5" aria-hidden />
              </IconButton>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canPost}
            className={cn(
              'min-h-11 w-full rounded-xl py-2.5 text-sm font-semibold transition-opacity',
              'bg-primary text-primary-foreground',
              'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              'disabled:opacity-40',
            )}
          >
            {submitLabel}
          </button>
        </div>
      </Modal.Panel>
    </Modal>
  );
}

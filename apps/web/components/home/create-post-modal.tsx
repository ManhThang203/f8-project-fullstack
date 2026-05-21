'use client';

import type { PostFeedItemDto } from '@threads/shared';
import { Image, MapPin, MoreHorizontal, Smile, Sticker, UserPlus, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

import type { DraftMedia } from './post-media-carousel';
import { PostMediaCarousel } from './post-media-carousel';

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
  onPosted,
}: Props) {
  const [content, setContent] = useState('');
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [phase, setPhase] = useState<ComposePhase>('idle');
  const [uploadLabel, setUploadLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayName = name ?? username ?? 'Bạn';
  const placeholder = `${displayName} ơi, bạn đang nghĩ gì thế?`;

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

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && phase === 'idle') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, phase]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

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
      onUploadProgress: (fileIndex, percent, fileName) => {
        setUploadLabel(fileName);
        setDrafts((prev) =>
          prev.map((d, i) =>
            i === fileIndex
              ? { ...d, status: 'uploading' as const, progress: percent }
              : d,
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

  if (!mounted) return null;

  const panelMotion = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0, y: 24, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 24, scale: 0.98 },
      };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="create-post-modal"
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.button
            type="button"
            tabIndex={-1}
            aria-hidden
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={phase === 'idle' ? onClose : undefined}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            ref={dialogRef}
            {...panelMotion}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              'border-border bg-card relative z-10 flex w-full min-h-0 flex-col overflow-hidden border shadow-2xl',
              'max-h-[min(92dvh,100%)] sm:max-h-[min(90dvh,100%)]',
              'w-full rounded-t-2xl sm:max-w-[480px] sm:rounded-2xl',
              'pb-[max(0px,env(safe-area-inset-bottom))]',
            )}
            onClick={(e) => e.stopPropagation()}
          >
              <motion.div className="border-border relative flex shrink-0 items-center justify-center border-b px-4 py-3 sm:py-4">
                <h3 id={titleId} className="text-foreground text-base font-semibold">
                  Tạo bài viết
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  aria-label="Đóng"
                  className={cn(
                    'absolute right-3 flex h-11 w-11 items-center justify-center rounded-full',
                    'text-muted-foreground hover:bg-muted transition-colors',
                    'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
                    'disabled:opacity-40',
                  )}
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </motion.div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="bg-muted h-10 w-10 shrink-0 overflow-hidden rounded-full">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-muted-foreground flex h-full w-full items-center justify-center text-sm font-semibold">
                        {displayName[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
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

              <motion.div className="border-border shrink-0 border-t px-4 py-3">
                <motion.div className="border-border mb-3 flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 sm:px-4">
                  <span className="text-muted-foreground hidden text-sm sm:inline">
                    Thêm vào bài viết của bạn
                  </span>
                  <span className="text-muted-foreground text-sm sm:hidden">Thêm</span>
                  <motion.div className="-mr-1 flex shrink-0 items-center gap-0.5 overflow-x-auto sm:gap-1">
                    <label
                      htmlFor="modal-file-input"
                      aria-label="Thêm ảnh hoặc video"
                      className={cn(
                        'flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full',
                        'text-muted-foreground hover:bg-muted transition-colors',
                        'focus-visible:outline-none',
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

                    <button
                      type="button"
                      aria-label="Tag người khác"
                      disabled={busy}
                      className="text-muted-foreground hover:bg-muted focus-visible:ring-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-40"
                    >
                      <UserPlus className="h-5 w-5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label="Cảm xúc"
                      disabled={busy}
                      className="text-muted-foreground hover:bg-muted focus-visible:ring-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-40"
                    >
                      <Smile className="h-5 w-5 text-[hsl(40,90%,60%)]" aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label="Vị trí"
                      disabled={busy}
                      className="text-muted-foreground hover:bg-muted focus-visible:ring-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-40"
                    >
                      <MapPin className="h-5 w-5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label="GIF"
                      disabled={busy}
                      className="text-muted-foreground hover:bg-muted focus-visible:ring-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-40"
                    >
                      <Sticker className="h-5 w-5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label="Thêm"
                      disabled={busy}
                      className="text-muted-foreground hover:bg-muted focus-visible:ring-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-40"
                    >
                      <MoreHorizontal className="h-5 w-5" aria-hidden />
                    </button>
                  </motion.div>
                </motion.div>

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
              </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

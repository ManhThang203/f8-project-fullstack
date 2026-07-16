'use client';

import type { PostMediaDto } from '@costy/shared';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { useRef, useState } from 'react';

import { FeedPostVideo } from './feed-video/feed-post-video';

import { cn } from '@/lib/utils';

export interface DraftMedia {
  tempId: string;
  url: string;
  mediaType?: 'image' | 'video';
  width?: number | null;
  height?: number | null;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  mediaId?: string;
}

type DisplayItem = { kind: 'posted'; data: PostMediaDto } | { kind: 'draft'; data: DraftMedia };

type Props =
  | {
      /** Feed mode: show committed media from a post */
      mode: 'feed';
      postId: string;
      items: PostMediaDto[];
    }
  | {
      /** Editable mode: show draft items during compose */
      mode: 'editable';
      items: DraftMedia[];
      onRemove: (tempId: string) => void;
      /** Thumbnail nhỏ cho ô nhập bình luận (kiểu Facebook). */
      compact?: boolean;
    };

type DragScrollSession = { startX: number; scrollLeft: number; pointerId: number };

function MediaPreview({
  type,
  url,
  className,
  feedVideo,
  postId,
  durationMs,
  width,
  height,
}: {
  type: 'image' | 'video';
  url: string;
  className?: string;
  feedVideo?: boolean;
  postId?: string;
  durationMs?: number | null;
  width?: number | null;
  height?: number | null;
}) {
  const [errored, setErrored] = useState(false);

  if (!url.trim() || errored) {
    return <div className={cn('bg-muted min-h-[120px] w-full rounded-2xl', className)} aria-hidden />;
  }

  if (type === 'video') {
    if (feedVideo && postId) {
      return (
        <FeedPostVideo
          postId={postId}
          src={url}
          durationMs={durationMs}
          width={width}
          height={height}
          className={className}
        />
      );
    }
    return (
      <video
        src={url}
        className={className}
        preload="metadata"
        playsInline
        muted
        onError={() => setErrored(true)}
      />
    );
  }
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      className={className}
      draggable={false}
      onError={() => setErrored(true)}
    />
  );
}

/** Horizontal scroll + mouse drag (native touch scroll unchanged). */
function HorizontalScroller({ children }: { children: ReactNode }) {
  const elRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragScrollSession | null>(null);
  const [grabbing, setGrabbing] = useState(false);

  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    const s = dragRef.current;
    if (!s || e.pointerId !== s.pointerId) return;
    dragRef.current = null;
    try {
      elRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    setGrabbing(false);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    if (e.pointerType !== 'mouse') return;
    if ((e.target as HTMLElement).closest('button, .feed-video-controls, input[type="range"]'))
      return;
    const el = elRef.current;
    if (!el) return;
    dragRef.current = {
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      pointerId: e.pointerId,
    };
    el.setPointerCapture(e.pointerId);
    setGrabbing(true);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const s = dragRef.current;
    if (!s || e.pointerId !== s.pointerId) return;
    const el = elRef.current;
    if (!el) return;
    el.scrollLeft = s.scrollLeft - (e.clientX - s.startX);
  }

  return (
    <div
      ref={elRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={cn(
        'relative mt-3 w-full touch-pan-x overflow-x-auto overflow-y-hidden overscroll-x-contain',
        '[-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] scrollbar-none',
        '[&::-webkit-scrollbar]:hidden',
        grabbing ? 'cursor-grabbing select-none' : 'cursor-grab',
      )}
      aria-label="Carousel ảnh"
    >
      <div className="flex w-max gap-2 pb-1">{children}</div>
    </div>
  );
}

export function PostMediaCarousel(props: Props) {
  const displayItems: DisplayItem[] =
    props.mode === 'feed'
      ? props.items.filter((d) => d.url.trim()).map((d) => ({ kind: 'posted', data: d }))
      : props.items.map((d) => ({ kind: 'draft', data: d }));

  const isCompactEditable = props.mode === 'editable' && props.compact;

  if (displayItems.length === 0) return null;

  // Single image — large display, preserve aspect ratio
  if (displayItems.length === 1) {
    const item = displayItems[0]!;
    const url = item.kind === 'posted' ? item.data.url : item.data.url;
    const mediaType = item.kind === 'posted' ? item.data.type : (item.data.mediaType ?? 'image');
    const isDraft = item.kind === 'draft';
    const draft = isDraft ? (item.data as DraftMedia) : null;

    return (
      <motion.div
        className={cn(
          'bg-muted relative overflow-hidden rounded-2xl',
          isCompactEditable
            ? 'mt-2 h-20 w-20 shrink-0 rounded-lg'
            : 'mt-3 flex w-full justify-center',
        )}
      >
        <MediaPreview
          type={mediaType}
          url={url}
          postId={props.mode === 'feed' ? props.postId : undefined}
          feedVideo={props.mode === 'feed' && mediaType === 'video'}
          durationMs={item.kind === 'posted' ? item.data.durationMs : undefined}
          width={item.data.width}
          height={item.data.height}
          className={cn(
            isCompactEditable ? 'h-20 w-20 rounded-lg object-cover' : 'rounded-2xl',
            props.mode === 'feed'
              ? mediaType === 'video'
                ? 'w-full'
                : 'max-h-[520px] w-auto max-w-full object-contain'
              : isCompactEditable
                ? ''
                : 'h-auto max-h-[360px] w-auto max-w-full object-contain',
          )}
        />
        {isDraft && draft && (
          <>
            {draft.status === 'uploading' && (
              <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-2xl bg-black/20">
                <div
                  className="bg-primary h-full transition-[width] duration-200"
                  style={{ width: `${draft.progress}%` }}
                />
              </div>
            )}
            {props.mode === 'editable' && (
              <button
                type="button"
                onClick={() => props.onRemove(draft.tempId)}
                aria-label="Xóa ảnh"
                className={cn(
                  'focus-visible:ring-ring absolute flex items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:opacity-80 focus-visible:outline-hidden focus-visible:ring-2',
                  isCompactEditable
                    ? 'right-1 top-1 h-5 w-5'
                    : 'right-2 top-2 h-7 w-7',
                )}
              >
                <X className={isCompactEditable ? 'h-3 w-3' : 'h-4 w-4'} aria-hidden />
              </button>
            )}
          </>
        )}
      </motion.div>
    );
  }

  // Multiple images — natural aspect per card, horizontal scroll
  const slides = displayItems.map((item) => {
    const key = item.kind === 'posted' ? item.data.id : item.data.tempId;
    const url = item.kind === 'posted' ? item.data.url : item.data.url;
    const mediaType = item.kind === 'posted' ? item.data.type : (item.data.mediaType ?? 'image');
    const isDraft = item.kind === 'draft';
    const draft = isDraft ? (item.data as DraftMedia) : null;

    return (
      <div
        key={key}
        className={cn(
          'bg-muted relative shrink-0 overflow-hidden rounded-2xl',
          isCompactEditable && 'h-20 w-20 rounded-lg',
        )}
      >
        <MediaPreview
          type={mediaType}
          url={url}
          postId={props.mode === 'feed' ? props.postId : undefined}
          feedVideo={props.mode === 'feed' && mediaType === 'video'}
          durationMs={item.kind === 'posted' ? item.data.durationMs : undefined}
          width={item.data.width}
          height={item.data.height}
          className={
            props.mode === 'feed' && mediaType === 'video'
              ? 'w-full rounded-2xl'
              : isCompactEditable
                ? 'h-20 w-20 select-none rounded-lg object-cover'
                : props.mode === 'editable'
                  ? 'h-[420px] w-auto select-none object-contain'
                  : 'h-[420px] w-auto select-none object-contain'
          }
        />

        {isDraft && draft && (
          <>
            {draft.status === 'uploading' && (
              <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-black/20">
                <div
                  className="bg-primary h-full transition-[width] duration-200"
                  style={{ width: `${draft.progress}%` }}
                />
              </div>
            )}
            {draft.status === 'error' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-white">
                Lỗi tải lên
              </div>
            )}
            {props.mode === 'editable' && (
              <button
                type="button"
                onClick={() => props.onRemove(draft.tempId)}
                aria-label="Xóa ảnh"
                className={cn(
                  'focus-visible:ring-ring absolute flex items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:opacity-80 focus-visible:outline-hidden focus-visible:ring-2',
                  isCompactEditable
                    ? 'right-1 top-1 h-5 w-5'
                    : 'right-2 top-2 h-7 w-7',
                )}
              >
                <X className={isCompactEditable ? 'h-3 w-3' : 'h-4 w-4'} aria-hidden />
              </button>
            )}
          </>
        )}
      </div>
    );
  });

  if (isCompactEditable) {
    return (
      <div
        className="mt-2 flex flex-wrap gap-2"
        aria-label="Ảnh đính kèm bình luận"
      >
        {slides}
      </div>
    );
  }

  return <HorizontalScroller>{slides}</HorizontalScroller>;
}

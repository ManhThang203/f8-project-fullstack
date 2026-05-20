'use client';

import type { PostMediaDto } from '@threads/shared';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { useRef, useState } from 'react';

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
      items: PostMediaDto[];
    }
  | {
      /** Editable mode: show draft items during compose */
      mode: 'editable';
      items: DraftMedia[];
      onRemove: (tempId: string) => void;
    };

type DragScrollSession = { startX: number; scrollLeft: number; pointerId: number };

function MediaPreview({
  type,
  url,
  className,
  feedVideo,
}: {
  type: 'image' | 'video';
  url: string;
  className?: string;
  /** When true, video shows native controls (feed view). */
  feedVideo?: boolean;
}) {
  if (type === 'video') {
    return (
      <video
        src={url}
        className={className}
        controls={feedVideo}
        preload="metadata"
        playsInline
        muted={!feedVideo}
      />
    );
  }
  return <img src={url} alt="" loading="lazy" className={className} draggable={false} />;
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
    if ((e.target as HTMLElement).closest('button')) return;
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
        '[-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] [scrollbar-width:none]',
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
      ? props.items.map((d) => ({ kind: 'posted', data: d }))
      : props.items.map((d) => ({ kind: 'draft', data: d }));

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
          'bg-muted relative mt-3 flex w-full justify-center overflow-hidden rounded-xl',
        )}
      >
        <MediaPreview
          type={mediaType}
          url={url}
          feedVideo={props.mode === 'feed' && mediaType === 'video'}
          className={cn(
            'rounded-xl',
            props.mode === 'feed'
              ? mediaType === 'video'
                ? 'max-h-[520px] w-full bg-black object-contain'
                : 'max-h-[520px] w-auto max-w-full object-contain'
              : 'h-auto max-h-[360px] w-auto max-w-full object-contain',
          )}
        />
        {isDraft && draft && (
          <>
            {draft.status === 'uploading' && (
              <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-xl bg-black/20">
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
                className="focus-visible:ring-ring absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2"
              >
                <X className="h-4 w-4" aria-hidden />
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
        className="bg-muted relative shrink-0 overflow-hidden rounded-xl"
      >
        <MediaPreview
          type={mediaType}
          url={url}
          feedVideo={props.mode === 'feed' && mediaType === 'video'}
          className="h-[420px] w-auto select-none object-contain"
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
                className="focus-visible:ring-ring absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </>
        )}
      </div>
    );
  });

  return <HorizontalScroller>{slides}</HorizontalScroller>;
}

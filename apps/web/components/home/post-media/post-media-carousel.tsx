'use client';

import type { PostMediaDto } from '@costy/shared';
import { X } from 'lucide-react';
import { useState, type CSSProperties } from 'react';

import { FeedPostVideo } from './feed-video/feed-post-video';
import { InstagramMediaCarousel, InstagramMediaSlide } from './instagram-media-carousel';
import { getFrameAspectFromSize, resolveFrameAspectRatio } from './media-frame.utils';

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
    return (
      <div className={cn('bg-muted min-h-[120px] w-full rounded-2xl', className)} aria-hidden />
    );
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
      className={cn('cursor-grab active:cursor-grabbing', className)}
      draggable={false}
      onError={() => setErrored(true)}
    />
  );
}

/** Overlay upload / xóa cho draft media. */
function DraftOverlays({
  draft,
  onRemove,
  compact,
}: {
  draft: DraftMedia;
  onRemove?: (tempId: string) => void;
  compact?: boolean;
}) {
  return (
    <>
      {draft.status === 'uploading' && (
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-black/20',
            compact ? 'rounded-b-lg' : 'rounded-b-2xl',
          )}
        >
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
      {onRemove ? (
        <button
          type="button"
          onClick={() => onRemove(draft.tempId)}
          aria-label="Xóa ảnh"
          className={cn(
            'focus-visible:ring-ring absolute flex items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:outline-hidden',
            compact ? 'top-1 right-1 h-5 w-5' : 'top-2 right-2 z-20 h-7 w-7',
          )}
        >
          <X className={compact ? 'h-3 w-3' : 'h-4 w-4'} aria-hidden />
        </button>
      ) : null}
    </>
  );
}

export function PostMediaCarousel(props: Props) {
  const displayItems: DisplayItem[] =
    props.mode === 'feed'
      ? props.items.filter((d) => d.url.trim()).map((d) => ({ kind: 'posted', data: d }))
      : props.items.map((d) => ({ kind: 'draft', data: d }));

  const isCompactEditable = props.mode === 'editable' && props.compact;
  const onRemove = props.mode === 'editable' ? props.onRemove : undefined;
  const feedPostId = props.mode === 'feed' ? props.postId : undefined;

  if (displayItems.length === 0) return null;

  // Single media — large display
  if (displayItems.length === 1) {
    const item = displayItems[0]!;
    const url = item.data.url;
    const mediaType = item.kind === 'posted' ? item.data.type : (item.data.mediaType ?? 'image');
    const isDraft = item.kind === 'draft';
    const draft = isDraft ? item.data : null;
    const isVideo = mediaType === 'video';
    // Mobile: khung cố định + object-cover để bo góc kín, không lộ viền hai bên
    const mobileFillFrame = !isCompactEditable && !isVideo;
    const frameAr = resolveFrameAspectRatio(item.data.width, item.data.height);

    return (
      <div
        className={cn(
          'bg-muted relative overflow-hidden',
          isCompactEditable
            ? 'mt-2 h-20 w-20 shrink-0 rounded-lg'
            : cn(
                'mt-3 w-full',
                isVideo ? 'rounded-3xl' : 'rounded-3xl md:flex md:justify-center md:rounded-none',
                mobileFillFrame && 'max-md:[aspect-ratio:var(--frame-ar)] max-md:max-h-[520px]',
              ),
        )}
        style={
          mobileFillFrame
            ? ({ ['--frame-ar']: String(frameAr) } as CSSProperties)
            : undefined
        }
      >
        <MediaPreview
          type={mediaType}
          url={url}
          postId={feedPostId}
          feedVideo={props.mode === 'feed' && isVideo}
          durationMs={item.kind === 'posted' ? item.data.durationMs : undefined}
          width={item.data.width}
          height={item.data.height}
          className={cn(
            isCompactEditable ? 'h-20 w-20 rounded-lg object-cover' : '',
            !isCompactEditable && !isVideo && 'rounded-3xl md:rounded-none',
            props.mode === 'feed'
              ? isVideo
                ? 'w-full rounded-3xl'
                : 'h-full w-full object-cover md:h-auto md:max-h-[520px] md:w-auto md:max-w-full md:object-contain'
              : isCompactEditable
                ? ''
                : 'h-full w-full object-cover md:h-auto md:max-h-[360px] md:w-auto md:max-w-full md:object-contain',
          )}
        />
        {isDraft && draft ? (
          <DraftOverlays draft={draft} onRemove={onRemove} compact={isCompactEditable} />
        ) : null}
      </div>
    );
  }

  // Compact editable — wrap thumbnails (không carousel)
  if (isCompactEditable) {
    return (
      <div className="mt-2 flex flex-wrap gap-2" aria-label="Ảnh đính kèm bình luận">
        {displayItems.map((item) => {
          const key = item.kind === 'posted' ? item.data.id : item.data.tempId;
          const mediaType =
            item.kind === 'posted' ? item.data.type : (item.data.mediaType ?? 'image');
          const draft = item.kind === 'draft' ? item.data : null;

          return (
            <div
              key={key}
              className="bg-muted relative h-20 w-20 shrink-0 overflow-hidden rounded-lg"
            >
              <MediaPreview
                type={mediaType}
                url={item.data.url}
                className="h-20 w-20 select-none rounded-lg object-cover"
              />
              {draft ? <DraftOverlays draft={draft} onRemove={onRemove} compact /> : null}
            </div>
          );
        })}
      </div>
    );
  }

  // Multiple images — Instagram carousel (product: không mix ảnh+video)
  const first = displayItems[0]!;
  const frameAspect = getFrameAspectFromSize(first.data.width, first.data.height);

  return (
    <InstagramMediaCarousel frameAspect={frameAspect}>
      {displayItems.map((item) => {
        const key = item.kind === 'posted' ? item.data.id : item.data.tempId;
        const mediaType =
          item.kind === 'posted' ? item.data.type : (item.data.mediaType ?? 'image');
        const isDraft = item.kind === 'draft';
        const draft = isDraft ? item.data : null;

        return (
          <InstagramMediaSlide key={key}>
            <MediaPreview
              type={mediaType}
              url={item.data.url}
              durationMs={item.kind === 'posted' ? item.data.durationMs : undefined}
              width={item.data.width}
              height={item.data.height}
              className="h-full w-full select-none object-cover md:object-contain"
            />
            {isDraft && draft ? <DraftOverlays draft={draft} onRemove={onRemove} /> : null}
          </InstagramMediaSlide>
        );
      })}
    </InstagramMediaCarousel>
  );
}

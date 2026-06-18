'use client';

import { ErrorCode } from '@costy/shared';
import { notFound } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';

import { ReelsNavControls } from './controls/reels-nav-controls';
import { ReelsAudioProvider } from './reels-audio-context';
import { useReelsSlideHeight } from './reels-layout.utils';
import { ReelsSkeleton } from './reels-skeleton';
import { ReelsSlide } from './reels-slide';

import { Button } from '@/components/shared/button';
import { flattenReelsFeedPages, useReelsFeed } from '@/hooks/queries/use-reels-feed';
import { authClient } from '@/lib/auth-client';
import { isApiQueryError } from '@/lib/api-query';

const SCROLL_CONTAINER_BASE =
  'overflow-y-auto snap-y snap-mandatory [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

function syncReelUrl(postId: string) {
  const targetPath = `/reel/${postId}`;
  if (window.location.pathname !== targetPath) {
    window.history.replaceState(null, '', targetPath);
  }
}

type Props = {
  initialPostId?: string;
};

export function ReelsFeed({ initialPostId }: Props) {
  const { data: session } = authClient.useSession();
  const slideHeight = useReelsSlideHeight(Boolean(session?.user));
  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useReelsFeed(initialPostId);

  const items = flattenReelsFeedPages(data?.pages);
  const [activeIndex, setActiveIndex] = useState(0);

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const isNotFound =
    isError &&
    isApiQueryError(error) &&
    error.code === ErrorCode.NOT_FOUND &&
    Boolean(initialPostId);

  useEffect(() => {
    const { body, documentElement: html } = document;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = html.style.overflow;

    html.classList.add('reels-scroll-lock');
    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';

    return () => {
      html.classList.remove('reels-scroll-lock');
      body.style.overflow = prevBodyOverflow;
      html.style.overflow = prevHtmlOverflow;
    };
  }, []);

  const scrollToSlide = useCallback((index: number) => {
    virtuosoRef.current?.scrollToIndex({ index, behavior: 'auto' });
  }, []);

  /** Tải trang reels tiếp theo khi cuộn tới cuối danh sách. */
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  /** Tính slide đang xem từ vị trí cuộn (mỗi slide cao đúng bằng viewport). */
  const updateActiveFromScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || el.clientHeight === 0) return;
    const index = Math.round(el.scrollTop / el.clientHeight);
    setActiveIndex((prev) => (prev === index ? prev : index));
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateActiveFromScroll, { passive: true });
    return () => el.removeEventListener('scroll', updateActiveFromScroll);
  }, [updateActiveFromScroll, isLoading]);

  useEffect(() => {
    const id = itemsRef.current[activeIndex]?.id;
    if (id) syncReelUrl(id);
  }, [activeIndex]);

  useEffect(() => {
    if (isLoading || items.length === 0) return;
    const firstId = items[0]?.id;
    if (firstId) syncReelUrl(firstId);
  }, [isLoading, items]);

  if (isNotFound) notFound();

  if (isLoading) {
    return (
      <div className="w-full" style={{ height: slideHeight }}>
        <ReelsSkeleton />
      </div>
    );
  }

  if (isError && !isNotFound) {
    return (
      <div
        className="flex w-full flex-col items-center justify-center gap-4 bg-black text-white"
        style={{ height: slideHeight }}
      >
        <p className="text-sm text-white/70">{error.message}</p>
        <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className="flex w-full flex-col items-center justify-center bg-black"
        style={{ height: slideHeight }}
      >
        <p className="text-sm text-white/50">Chưa có Reels nào.</p>
      </div>
    );
  }

  return (
    <ReelsAudioProvider>
      <div className="relative">
        <Virtuoso
          ref={virtuosoRef}
          scrollerRef={(el) => {
            scrollerRef.current = el as HTMLElement | null;
          }}
          className={SCROLL_CONTAINER_BASE}
          style={{ height: slideHeight }}
          data={items}
          computeItemKey={(_, item) => item.id}
          initialTopMostItemIndex={initialPostId ? 0 : undefined}
          endReached={handleEndReached}
          increaseViewportBy={{ top: 600, bottom: 800 }}
          itemContent={(index, item) => (
            <ReelsSlide
              item={item}
              slideHeight={slideHeight}
              isActive={index === activeIndex}
            />
          )}
          components={{
            Footer: () =>
              isFetchingNextPage ? (
                <div className="w-full shrink-0 snap-start" style={{ height: slideHeight }}>
                  <ReelsSkeleton />
                </div>
              ) : null,
          }}
        />

        <ReelsNavControls
          onPrev={() => scrollToSlide(activeIndex - 1)}
          onNext={() => scrollToSlide(activeIndex + 1)}
          canPrev={activeIndex > 0}
          canNext={activeIndex < items.length - 1}
        />
      </div>
    </ReelsAudioProvider>
  );
}

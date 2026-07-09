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

import { useInitialUser } from '@/components/shared/providers/current-user-context';
import { Button } from '@/components/shared/ui';
import { flattenReelsFeedPages, useReelsFeed } from '@/hooks/queries/reels';
import { useScrollLock } from '@/hooks/ui';
import { getUserFacingErrorMessage, isApiQueryError } from '@/lib/api';

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
  const initialUser = useInitialUser();
  const slideHeight = useReelsSlideHeight(Boolean(initialUser));
  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useReelsFeed(initialPostId);

  const items = flattenReelsFeedPages(data?.pages);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeId = items[activeIndex]?.id;

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);

  const isNotFound =
    isError &&
    isApiQueryError(error) &&
    error.code === ErrorCode.NOT_FOUND &&
    Boolean(initialPostId);

  useScrollLock(true, { htmlClass: 'reels-scroll-lock' });

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
    if (isLoading || !activeId) return;
    syncReelUrl(activeId);
  }, [activeId, isLoading]);

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
        <p className="text-sm text-white/70">{getUserFacingErrorMessage(error)}</p>
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

  const virtuosoInitialIndexProps = initialPostId ? { initialTopMostItemIndex: 0 } : {};

  return (
    <ReelsAudioProvider>
      <div className="relative">
        <Virtuoso
          {...virtuosoInitialIndexProps}
          ref={virtuosoRef}
          scrollerRef={(el) => {
            scrollerRef.current = el as HTMLElement | null;
          }}
          className={SCROLL_CONTAINER_BASE}
          style={{ height: slideHeight }}
          data={items}
          computeItemKey={(_, item) => item.id}
          endReached={handleEndReached}
          increaseViewportBy={{ top: 600, bottom: 800 }}
          itemContent={(index, item) => (
            <ReelsSlide
              item={item}
              slideHeight={slideHeight}
              isActive={index === activeIndex}
              currentUserId={initialUser?.id}
              currentUser={initialUser}
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

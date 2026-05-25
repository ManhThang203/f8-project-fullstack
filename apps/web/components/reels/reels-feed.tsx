'use client';

import { ErrorCode } from '@threads/shared';
import { notFound } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/shared/button';
import { flattenReelsFeedPages, useReelsFeed } from '@/hooks/queries/use-reels-feed';
import { isApiQueryError } from '@/lib/api-query';

import { ReelsNavControls } from './controls/reels-nav-controls';
import { ReelsAudioProvider } from './reels-audio-context';
import { ReelsSkeleton } from './reels-skeleton';
import { ReelsSlide } from './reels-slide';

const SLIDE_HEIGHT = 'h-[calc(100dvh-3.5rem)]';

const SCROLL_CONTAINER_CLASS = [
  SLIDE_HEIGHT,
  'overflow-y-auto snap-y snap-mandatory',
  '[-ms-overflow-style:none]',
  '[-webkit-overflow-scrolling:touch]',
  '[scrollbar-width:none]',
  '[&::-webkit-scrollbar]:hidden',
].join(' ');

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
  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useReelsFeed(initialPostId);

  const items = flattenReelsFeedPages(data?.pages);
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
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
    const slides = containerRef.current?.querySelectorAll('[data-reels-slide]');
    slides?.[index]?.scrollIntoView({ behavior: 'auto' });
  }, []);

  const handleBecomeActive = useCallback((index: number) => {
    setActiveIndex(index);
    const id = itemsRef.current[index]?.id;
    if (id) syncReelUrl(id);
  }, []);

  useEffect(() => {
    if (isLoading || items.length === 0) return;
    const firstId = items[0]?.id;
    if (firstId) syncReelUrl(firstId);
  }, [isLoading, items]);

  useEffect(() => {
    if (isLoading || items.length === 0 || !initialPostId) return;
    scrollToSlide(0);
  }, [isLoading, items.length, initialPostId, scrollToSlide]);

  useEffect(() => {
    if (isLoading) return;

    const el = loadMoreRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        if (!hasNextPage || isFetchingNextPage) return;
        void fetchNextPage();
      },
      { root: containerRef.current, rootMargin: '400px' },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isLoading]);

  if (isNotFound) notFound();

  if (isLoading) {
    return (
      <div className={`${SLIDE_HEIGHT} w-full`}>
        <ReelsSkeleton />
      </div>
    );
  }

  if (isError && !isNotFound) {
    return (
      <div
        className={`flex ${SLIDE_HEIGHT} flex-col items-center justify-center gap-4 bg-black text-white`}
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
      <div className={`flex ${SLIDE_HEIGHT} flex-col items-center justify-center bg-black`}>
        <p className="text-sm text-white/50">Chưa có Reels nào.</p>
      </div>
    );
  }

  return (
    <ReelsAudioProvider>
      <div className="relative">
        <div ref={containerRef} className={SCROLL_CONTAINER_CLASS}>
          {items.map((item, index) => (
            <ReelsSlide
              key={item.id}
              item={item}
              index={index}
              onBecomeActive={handleBecomeActive}
            />
          ))}

          <div ref={loadMoreRef} className="h-px shrink-0" />

          {isFetchingNextPage && (
            <div className={`${SLIDE_HEIGHT} w-full shrink-0 snap-start`}>
              <ReelsSkeleton />
            </div>
          )}
        </div>

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

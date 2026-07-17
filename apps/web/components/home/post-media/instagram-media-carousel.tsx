'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';

import { CarouselNavControls } from './carousel-nav-controls';
import {
  clampAspect,
  MAX_FRAME_HEIGHT_PX,
} from './media-frame.utils';

import { cn } from '@/lib/utils';

type EmblaOptions = NonNullable<Parameters<typeof useEmblaCarousel>[0]>;

type Props = {
  children: ReactNode;
  /** Tỉ lệ khung từ media đầu (width/height). */
  frameAspect?: number | null;
  className?: string;
};

/** Carousel 1 slide full-width (Embla): vuốt, mũi tên desktop, chấm phân trang. */
export function InstagramMediaCarousel({ children, frameAspect, className }: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Áp dụng prefers-reduced-motion cho duration Embla.
    function apply() {
      setReduceMotion(mq.matches);
    }
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const emblaOptions = useMemo<EmblaOptions>(
    () => ({
      loop: false,
      align: 'start',
      duration: reduceMotion ? 0 : 25,
    }),
    [reduceMotion],
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [slideCount, setSlideCount] = useState(0);
  const [grabbing, setGrabbing] = useState(false);

  const frameStyle = useMemo<CSSProperties>(() => {
    const ratio = frameAspect && frameAspect > 0 ? clampAspect(frameAspect) : 1;
    return {
      aspectRatio: `${ratio}`,
      maxHeight: MAX_FRAME_HEIGHT_PX,
    };
  }, [frameAspect]);

  /** Đồng bộ index và trạng thái prev/next từ Embla. */
  const syncState = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
    setSlideCount(emblaApi.scrollSnapList().length);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    syncState();

    // Đổi cursor bàn tay mở → nắm khi kéo carousel.
    function onPointerDown() {
      setGrabbing(true);
    }
    function onPointerUp() {
      setGrabbing(false);
    }

    emblaApi.on('select', syncState);
    emblaApi.on('reInit', syncState);
    emblaApi.on('pointerDown', onPointerDown);
    emblaApi.on('pointerUp', onPointerUp);
    return () => {
      emblaApi.off('select', syncState);
      emblaApi.off('reInit', syncState);
      emblaApi.off('pointerDown', onPointerDown);
      emblaApi.off('pointerUp', onPointerUp);
    };
  }, [emblaApi, syncState]);

  return (
    <div
      className={cn('bg-muted relative mt-3 w-full overflow-hidden rounded-3xl', className)}
      style={frameStyle}
      aria-roledescription="carousel"
      aria-label="Carousel ảnh"
    >
      <div
        ref={emblaRef}
        className={cn(
          'h-full overflow-hidden',
          grabbing ? 'cursor-grabbing [&_img]:cursor-grabbing' : 'cursor-grab [&_img]:cursor-grab',
        )}
      >
        <div className="flex h-full">{children}</div>
      </div>

      <CarouselNavControls
        slideCount={slideCount}
        selectedIndex={selectedIndex}
        canScrollPrev={canScrollPrev}
        canScrollNext={canScrollNext}
        onPrev={() => emblaApi?.scrollPrev()}
        onNext={() => emblaApi?.scrollNext()}
        onDotSelect={(i) => emblaApi?.scrollTo(i)}
      />
    </div>
  );
}

/** Slide full-width trong InstagramMediaCarousel. */
export function InstagramMediaSlide({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex h-full min-w-0 shrink-0 grow-0 basis-full items-center justify-center overflow-hidden',
        className,
      )}
    >
      {children}
    </div>
  );
}

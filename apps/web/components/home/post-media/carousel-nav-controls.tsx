'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

type Props = {
  slideCount: number;
  selectedIndex: number;
  canScrollPrev: boolean;
  canScrollNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onDotSelect: (index: number) => void;
};

/** Mũi tên prev/next (desktop) và chấm phân trang cho carousel ảnh. */
export function CarouselNavControls({
  slideCount,
  selectedIndex,
  canScrollPrev,
  canScrollNext,
  onPrev,
  onNext,
  onDotSelect,
}: Props) {
  if (slideCount < 2) return null;

  return (
    <>
      {canScrollPrev ? (
        <button
          type="button"
          onClick={onPrev}
          aria-label="Ảnh trước"
          className={cn(
            'absolute top-1/2 left-2 z-10 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full',
            'bg-black/40 text-white transition-opacity duration-150 hover:opacity-90',
            'focus-visible:ring-ring focus-visible:outline-hidden focus-visible:ring-2',
            'md:flex',
          )}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
      ) : null}

      {canScrollNext ? (
        <button
          type="button"
          onClick={onNext}
          aria-label="Ảnh sau"
          className={cn(
            'absolute top-1/2 right-2 z-10 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full',
            'bg-black/40 text-white transition-opacity duration-150 hover:opacity-90',
            'focus-visible:ring-ring focus-visible:outline-hidden focus-visible:ring-2',
            'md:flex',
          )}
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      ) : null}

      <div
        className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex h-11 items-center justify-center gap-0.5"
        role="tablist"
        aria-label="Chỉ số ảnh"
      >
        {Array.from({ length: slideCount }, (_, i) => {
          const isActive = i === selectedIndex;
          return (
            <button
              key={i}
              type="button"
              role="tab"
              aria-label={`Ảnh ${i + 1} / ${slideCount}`}
              aria-selected={isActive}
              aria-current={isActive ? 'true' : undefined}
              onClick={() => onDotSelect(i)}
              className={cn(
                'pointer-events-auto flex h-11 w-3 cursor-pointer items-center justify-center',
                'focus-visible:ring-ring rounded-full focus-visible:outline-hidden focus-visible:ring-2',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full transition-colors duration-150',
                  isActive ? 'bg-white' : 'bg-white/40',
                )}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </>
  );
}

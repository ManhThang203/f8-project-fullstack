'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';

import { cn } from '@/lib/utils';

type Props = {
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
};

const navBtn =
  'flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/60 bg-black/40 text-white backdrop-blur-sm transition-colors duration-150 hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:pointer-events-none disabled:opacity-30';

export function ReelsNavControls({ onPrev, onNext, canPrev, canNext }: Props) {
  return (
    <div
      className={cn(
        'fixed right-[max(0.75rem,env(safe-area-inset-right))] top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-3 lg:right-6 lg:flex',
      )}
    >
      <button
        type="button"
        aria-label="Reels trước"
        className={navBtn}
        disabled={!canPrev}
        onClick={onPrev}
      >
        <ChevronUp className="h-6 w-6" aria-hidden />
      </button>

      <button
        type="button"
        aria-label="Reels tiếp theo"
        className={navBtn}
        disabled={!canNext}
        onClick={onNext}
      >
        <ChevronDown className="h-6 w-6" aria-hidden />
      </button>
    </div>
  );
}

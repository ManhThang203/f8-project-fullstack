'use client';

import type { ReactNode } from 'react';

import { ReactionFace, type PostReactionId } from './reaction-face';

import { cn } from '@/lib/utils';

type ReactionOption = {
  id: PostReactionId;
  label: string;
};

type Props = {
  open: boolean;
  onOpen: () => void;
  onScheduleClose: () => void;
  reactions: ReactionOption[];
  onSelect: (id: PostReactionId) => void;
  children: ReactNode;
  className?: string;
  toolbarClassName?: string;
  zIndexClassName?: string;
};

/** Popover chọn cảm xúc: vùng cầu nối padding giữ hover khi di chuột chậm từ trigger lên toolbar. */
export function ReactionPickerPopover({
  open,
  onOpen,
  onScheduleClose,
  reactions,
  onSelect,
  children,
  className,
  toolbarClassName,
  zIndexClassName = 'z-30',
}: Props) {
  return (
    <div
      className={cn('relative', className)}
      onMouseEnter={onOpen}
      onMouseLeave={onScheduleClose}
    >
      {open && (
        <div
          className={cn('absolute bottom-full left-0 pb-3', zIndexClassName)}
          role="presentation"
        >
          <div
            role="toolbar"
            aria-label="Chọn cảm xúc"
            className={cn(
              'bg-card border-border flex items-center rounded-full border px-1.5 py-1.5 shadow-lg',
              toolbarClassName,
            )}
          >
            <div className="flex items-center gap-0.5">
              {reactions.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  aria-label={r.label}
                  title={r.label}
                  onClick={() => onSelect(r.id)}
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                    'transition-transform duration-150 motion-safe:hover:z-10 motion-safe:hover:scale-125',
                    'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                  )}
                >
                  <ReactionFace id={r.id} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

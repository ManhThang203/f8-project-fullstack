'use client';

import { Smile } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { EmojiPickerPanel } from '@/components/shared/emoji-picker-panel';
import { useMediaQuery, useScrollLock } from '@/hooks/ui';
import { computePopoverPosition, getDesktopPopoverSize } from '@/lib/emoji';
import { cn } from '@/lib/utils';

type Props = {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
};

const triggerSizeClass = {
  sm: 'h-11 w-11',
  md: 'h-11 w-11',
} as const;

const OVERLAY_Z = 'z-[120]';

/** Emoji picker compose: desktop popover (portal) + mobile bottom sheet. */
export function ComposeEmojiPicker({ onSelect, disabled = false, size = 'md', className }: Props) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const [popoverSize, setPopoverSize] = useState({ width: 352, height: 420 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const updatePopoverPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const sizeNext = getDesktopPopoverSize();
    setPopoverSize(sizeNext);
    setPopoverPos(
      computePopoverPosition(
        triggerRef.current.getBoundingClientRect(),
        sizeNext.width,
        sizeNext.height,
      ),
    );
  }, []);

  useLayoutEffect(() => {
    if (!open || !isDesktop) return;
    updatePopoverPosition();
    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);
    return () => {
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [open, isDesktop, updatePopoverPosition]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  useScrollLock(open && !isDesktop);

  useEffect(() => {
    if (!open || !isDesktop) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      close();
    }

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, isDesktop, close]);

  function handleSelect(emoji: string) {
    onSelect(emoji);
  }

  function toggleOpen() {
    if (disabled) return;
    setOpen((prev) => !prev);
  }

  const sheetHeight =
    typeof window !== 'undefined' ? Math.min(430, Math.floor(window.innerHeight * 0.55)) : 430;

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      aria-label="Thêm emoji"
      aria-expanded={open}
      aria-haspopup="dialog"
      disabled={disabled}
      onClick={toggleOpen}
      className={cn(
        'text-muted-foreground hover:bg-muted inline-flex shrink-0 items-center justify-center rounded-full transition-colors',
        'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
        'disabled:pointer-events-none disabled:opacity-40',
        triggerSizeClass[size],
        className,
      )}
    >
      <Smile
        className={cn('text-[hsl(40,90%,60%)]', size === 'sm' ? 'h-4 w-4' : 'h-5 w-5')}
        aria-hidden
      />
    </button>
  );

  const overlay =
    open && mounted
      ? isDesktop
        ? createPortal(
            <div
              ref={popoverRef}
              role="dialog"
              aria-label="Chọn emoji"
              className={cn(
                'bg-card fixed overflow-hidden rounded-2xl shadow-2xl ring-1 ring-border/40',
                OVERLAY_Z,
              )}
              style={{
                top: popoverPos.top,
                left: popoverPos.left,
                width: popoverSize.width,
                height: popoverSize.height,
              }}
            >
              <EmojiPickerPanel onSelect={handleSelect} height={popoverSize.height} />
            </div>,
            document.body,
          )
        : createPortal(
            <div className={cn('fixed inset-0', OVERLAY_Z)} role="presentation">
              <button
                type="button"
                aria-label="Đóng chọn emoji"
                className="absolute inset-0 bg-black/50"
                onClick={close}
              />
              <div
                role="dialog"
                aria-label="Chọn emoji"
                className="bg-card absolute inset-x-0 bottom-0 flex max-h-[55dvh] flex-col overflow-hidden rounded-t-2xl shadow-2xl ring-1 ring-border/40"
              >
                <div className="flex shrink-0 flex-col items-center pt-2 pb-1">
                  <div className="bg-muted mb-1 h-1 w-10 rounded-full" aria-hidden />
                </div>
                <div className="min-h-0 flex-1 overflow-hidden pb-[max(0px,env(safe-area-inset-bottom))]">
                  <EmojiPickerPanel onSelect={handleSelect} height={sheetHeight} />
                </div>
              </div>
            </div>,
            document.body,
          )
      : null;

  return (
    <>
      {trigger}
      {overlay}
    </>
  );
}

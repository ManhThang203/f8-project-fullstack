const VIEWPORT_MARGIN = 12;
const GAP = 8;

/** Tính vị trí popover neo nút trigger, ưu tiên mở phía trên, flip khi sát mép. */
export function computePopoverPosition(
  triggerRect: DOMRect,
  popoverWidth: number,
  popoverHeight: number,
): { top: number; left: number } {
  const maxLeft = window.innerWidth - popoverWidth - VIEWPORT_MARGIN;
  let left = triggerRect.left;
  if (left > maxLeft) left = maxLeft;
  if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;

  let top = triggerRect.top - popoverHeight - GAP;
  if (top < VIEWPORT_MARGIN) {
    top = triggerRect.bottom + GAP;
  }

  const maxTop = window.innerHeight - popoverHeight - VIEWPORT_MARGIN;
  if (top > maxTop) top = Math.max(VIEWPORT_MARGIN, maxTop);

  return { top, left };
}

/** Kích thước popover desktop theo Threads (~340×430). */
export function getDesktopPopoverSize(): { width: number; height: number } {
  const width = Math.min(340, window.innerWidth - 24);
  const height = Math.min(430, Math.floor(window.innerHeight * 0.52));
  return { width, height };
}

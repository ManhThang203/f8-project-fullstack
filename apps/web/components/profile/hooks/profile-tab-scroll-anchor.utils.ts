/** Offset sticky tabs khớp site header h-14 / sticky top-14 (px). */
export const SITE_HEADER_OFFSET = 56;

const STICKY_TOLERANCE_PX = 1;

/** Lấy offset sticky thực tế: tabs đã dính thì dùng top đo được, không thì fallback h-14. */
export function resolveStickyHeaderOffset(
  tabsRect: DOMRect,
  fallback = SITE_HEADER_OFFSET,
): number {
  if (tabsRect.top <= fallback + STICKY_TOLERANCE_PX) {
    return Math.max(0, tabsRect.top);
  }
  return fallback;
}

/** Tính scrollY mục tiêu để mép tabs khớp dưới site header. */
export function computeTabScrollTarget(
  tabsRect: DOMRect,
  scrollY: number,
  headerOffset = resolveStickyHeaderOffset(tabsRect),
): number {
  const tabsTop = tabsRect.top + scrollY;
  return Math.max(0, tabsTop - headerOffset);
}

/** Quyết định có cần neo scroll trước khi đổi tab (sticky hoặc đã cuộn sâu vào panel). */
export function shouldCaptureTabScrollAnchor(
  tabsRect: DOMRect,
  _scrollY: number,
  panelMinHeight: number,
  viewportHeight: number,
): boolean {
  const headerOffset = resolveStickyHeaderOffset(tabsRect);
  const isSticky = tabsRect.top <= headerOffset + STICKY_TOLERANCE_PX;
  const isDeepScroll = panelMinHeight > viewportHeight * 0.5;

  return isSticky || isDeepScroll;
}

/** Xóa minHeight tạm trên tabpanel. */
export function clearPanelMinHeight(panelEl: HTMLElement | null | undefined): void {
  if (panelEl) panelEl.style.minHeight = '';
}

/** Ghi minHeight tạm lên tabpanel để tránh document height tụt đột ngột. */
export function applyPanelMinHeight(panelEl: HTMLElement | null | undefined, height: number): void {
  if (panelEl && height > 0) {
    panelEl.style.minHeight = `${height}px`;
  }
}

'use client';

import type { ProfileTab } from '@/components/profile/profile-utils';
import { useCallback, useLayoutEffect, useRef } from 'react';

import {
  applyPanelMinHeight,
  clearPanelMinHeight,
  computeTabScrollTarget,
  resolveStickyHeaderOffset,
  shouldCaptureTabScrollAnchor,
} from '@/components/profile/hooks/profile-tab-scroll-anchor.utils';

export { SITE_HEADER_OFFSET } from '@/components/profile/hooks/profile-tab-scroll-anchor.utils';

type PendingAnchor = {
  scrollTarget: number;
};

/** Neo scroll window về mép tabs khi đổi tab, tránh browser clamp khi Virtuoso unmount. */
export function useProfileTabScrollAnchor(activeTab: ProfileTab) {
  const panelRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<PendingAnchor | null>(null);
  const clearMinHeightRafRef = useRef<number | null>(null);

  /** Hủy rAF clear minHeight nếu đang chờ. */
  const cancelScheduledMinHeightClear = useCallback(() => {
    if (clearMinHeightRafRef.current !== null) {
      cancelAnimationFrame(clearMinHeightRafRef.current);
      clearMinHeightRafRef.current = null;
    }
  }, []);

  /** Ghi nhận vị trí scroll và chiều cao panel trước khi đổi tab. */
  const captureBeforeTabChange = useCallback(
    (tabsEl: HTMLElement) => {
      cancelScheduledMinHeightClear();

      const tabsRect = tabsEl.getBoundingClientRect();
      const panelEl = panelRef.current;
      const panelMinHeight = panelEl?.offsetHeight ?? 0;

      if (
        !shouldCaptureTabScrollAnchor(
          tabsRect,
          window.scrollY,
          panelMinHeight,
          window.innerHeight,
        )
      ) {
        pendingRef.current = null;
        clearPanelMinHeight(panelEl);
        return;
      }

      const headerOffset = resolveStickyHeaderOffset(tabsRect);
      const scrollTarget = computeTabScrollTarget(tabsRect, window.scrollY, headerOffset);

      pendingRef.current = { scrollTarget };
      applyPanelMinHeight(panelEl, panelMinHeight);
    },
    [cancelScheduledMinHeightClear],
  );

  /** Khôi phục scroll về mép tabs sau khi nội dung tab mới mount. */
  useLayoutEffect(() => {
    const pending = pendingRef.current;
    if (!pending) return;

    pendingRef.current = null;

    window.scrollTo({ top: pending.scrollTarget, behavior: 'instant' as ScrollBehavior });
    if (Math.abs(window.scrollY - pending.scrollTarget) > 1) {
      window.scrollTo({ top: pending.scrollTarget, behavior: 'auto' });
    }

    const panelEl = panelRef.current;
    cancelScheduledMinHeightClear();
    clearMinHeightRafRef.current = requestAnimationFrame(() => {
      clearMinHeightRafRef.current = requestAnimationFrame(() => {
        clearMinHeightRafRef.current = null;
        clearPanelMinHeight(panelEl);
      });
    });
  }, [activeTab, cancelScheduledMinHeightClear]);

  /** Dọn minHeight tạm khi rời trang profile. */
  useLayoutEffect(() => {
    return () => {
      cancelScheduledMinHeightClear();
      clearPanelMinHeight(panelRef.current);
      pendingRef.current = null;
    };
  }, [cancelScheduledMinHeightClear]);

  return { panelRef, captureBeforeTabChange };
}

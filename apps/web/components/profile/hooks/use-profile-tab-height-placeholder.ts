'use client';

import type { ProfileTab } from '@/components/profile/profile-utils';
import { useCallback, useLayoutEffect, useRef } from 'react';

/** Giữ minHeight tabpanel khi đổi tab — tránh document xẹp → browser clamp scroll → header giật. */
export function useProfileTabHeightPlaceholder(activeTab: ProfileTab) {
  const panelRef = useRef<HTMLDivElement>(null);
  const heldHeightRef = useRef<number | null>(null);
  const scrollYRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  /** Hủy rAF đang chờ clear placeholder. */
  const cancelScheduledClear = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  /** Xóa minHeight tạm trên panel. */
  const clearPanelMinHeight = useCallback(() => {
    const panel = panelRef.current;
    if (panel) panel.style.minHeight = '';
    heldHeightRef.current = null;
  }, []);

  /** Ghi chiều cao panel trước khi đổi tab. */
  const captureBeforeTabChange = useCallback(() => {
    cancelScheduledClear();
    const panel = panelRef.current;
    if (!panel) return;

    const height = panel.offsetHeight;
    if (height <= 0) {
      heldHeightRef.current = null;
      return;
    }

    scrollYRef.current = window.scrollY;
    heldHeightRef.current = height;
    panel.style.minHeight = `${height}px`;
  }, [cancelScheduledClear]);

  /** Sau khi tab mới mount: bỏ placeholder và khôi phục scrollY nếu bị lệch. */
  useLayoutEffect(() => {
    if (heldHeightRef.current === null) return;

    const targetScrollY = scrollYRef.current;

    cancelScheduledClear();
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        clearPanelMinHeight();
        if (Math.abs(window.scrollY - targetScrollY) > 1) {
          window.scrollTo({ top: targetScrollY, behavior: 'instant' as ScrollBehavior });
        }
      });
    });

    return cancelScheduledClear;
  }, [activeTab, cancelScheduledClear, clearPanelMinHeight]);

  /** Dọn placeholder khi rời trang profile. */
  useLayoutEffect(() => {
    return () => {
      cancelScheduledClear();
      clearPanelMinHeight();
    };
  }, [cancelScheduledClear, clearPanelMinHeight]);

  return { panelRef, captureBeforeTabChange };
}

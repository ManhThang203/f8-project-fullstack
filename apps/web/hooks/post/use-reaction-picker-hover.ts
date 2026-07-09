'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_HIDE_MS = 200;

/**
 * State machine hiển thị popover reaction khi hover: mở ngay, đóng trễ (grace period)
 * để con trỏ kịp di chuyển từ nút Thích sang popover mà không bị đóng.
 */
export function useReactionPickerHover(hideMs: number = DEFAULT_HIDE_MS) {
  const [showPicker, setShowPicker] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const openPicker = useCallback(() => {
    clearHideTimer();
    setShowPicker(true);
  }, [clearHideTimer]);

  const scheduleHidePicker = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => setShowPicker(false), hideMs);
  }, [clearHideTimer, hideMs]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  return { showPicker, setShowPicker, openPicker, scheduleHidePicker, clearHideTimer };
}

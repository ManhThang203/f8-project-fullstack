'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_OPEN_MS = 600;
const DEFAULT_HIDE_MS = 600;

/**
 * State machine hiển thị popover reaction khi hover: mở trễ (tránh hover lướt),
 * đóng trễ (grace period) để con trỏ kịp di chuyển từ nút Thích sang popover.
 * openPicker mở ngay — dùng cho long-press.
 */
export function useReactionPickerHover(
  openMs: number = DEFAULT_OPEN_MS,
  hideMs: number = DEFAULT_HIDE_MS,
) {
  const [showPicker, setShowPicker] = useState(false);
  const showPickerRef = useRef(false);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  /** Mở picker ngay (long-press). */
  const openPicker = useCallback(() => {
    clearTimers();
    showPickerRef.current = true;
    setShowPicker(true);
  }, [clearTimers]);

  /** Đóng picker ngay (sau khi chọn reaction). */
  const closePicker = useCallback(() => {
    clearTimers();
    showPickerRef.current = false;
    setShowPicker(false);
  }, [clearTimers]);

  /** Lên lịch mở sau openMs; nếu đã mở thì chỉ hủy timer đóng. */
  const scheduleOpenPicker = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (showPickerRef.current || openTimerRef.current) return;
    openTimerRef.current = setTimeout(() => {
      openTimerRef.current = null;
      showPickerRef.current = true;
      setShowPicker(true);
    }, openMs);
  }, [openMs]);

  /** Hủy open đang chờ; nếu đang mở thì đóng sau hideMs. */
  const scheduleHidePicker = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (!showPickerRef.current) return;
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      showPickerRef.current = false;
      setShowPicker(false);
    }, hideMs);
  }, [hideMs]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return {
    showPicker,
    openPicker,
    closePicker,
    scheduleOpenPicker,
    scheduleHidePicker,
  };
}

'use client';

import { useCallback, useEffect, useRef } from 'react';

const DEFAULT_LONG_PRESS_MS = 400;

/**
 * Long-press (dí giữ) để mở reaction picker trên touch/mobile.
 * guardClick bọc onClick like để bỏ qua lần click sau khi vừa mở bằng long-press.
 */
export function useReactionLongPress(
  openPicker: () => void,
  ms: number = DEFAULT_LONG_PRESS_MS,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedByLongPressRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(() => {
    clearTimer();
    openedByLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      openedByLongPressRef.current = true;
      openPicker();
    }, ms);
  }, [clearTimer, ms, openPicker]);

  const onPointerUp = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const onPointerLeave = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const onPointerCancel = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  /** Bọc handler click: bỏ qua nếu vừa mở picker bằng long-press. */
  const guardClick = useCallback((handler: () => void) => {
    return () => {
      if (openedByLongPressRef.current) {
        openedByLongPressRef.current = false;
        return;
      }
      handler();
    };
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return {
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
    guardClick,
  };
}

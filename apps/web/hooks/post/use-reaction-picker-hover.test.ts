import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useReactionPickerHover } from './use-reaction-picker-hover';

const OPEN_MS = 600;
const HIDE_MS = 600;

describe('useReactionPickerHover', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('không mở khi hover ngắn hơn openMs', () => {
    const { result } = renderHook(() => useReactionPickerHover(OPEN_MS, HIDE_MS));

    act(() => {
      result.current.scheduleOpenPicker();
    });
    expect(result.current.showPicker).toBe(false);

    act(() => {
      vi.advanceTimersByTime(OPEN_MS - 1);
    });
    expect(result.current.showPicker).toBe(false);

    act(() => {
      result.current.scheduleHidePicker();
    });
    act(() => {
      vi.advanceTimersByTime(OPEN_MS);
    });
    expect(result.current.showPicker).toBe(false);
  });

  it('mở sau đúng openMs khi giữ hover', () => {
    const { result } = renderHook(() => useReactionPickerHover(OPEN_MS, HIDE_MS));

    act(() => {
      result.current.scheduleOpenPicker();
    });

    act(() => {
      vi.advanceTimersByTime(OPEN_MS);
    });
    expect(result.current.showPicker).toBe(true);
  });

  it('đóng sau hideMs khi rời vùng; quay lại trong grace thì giữ mở', () => {
    const { result } = renderHook(() => useReactionPickerHover(OPEN_MS, HIDE_MS));

    act(() => {
      result.current.openPicker();
    });
    expect(result.current.showPicker).toBe(true);

    act(() => {
      result.current.scheduleHidePicker();
    });
    act(() => {
      vi.advanceTimersByTime(HIDE_MS - 1);
    });
    expect(result.current.showPicker).toBe(true);

    act(() => {
      result.current.scheduleOpenPicker();
    });
    act(() => {
      vi.advanceTimersByTime(HIDE_MS);
    });
    expect(result.current.showPicker).toBe(true);
  });

  it('đóng sau đủ hideMs nếu không quay lại', () => {
    const { result } = renderHook(() => useReactionPickerHover(OPEN_MS, HIDE_MS));

    act(() => {
      result.current.openPicker();
      result.current.scheduleHidePicker();
    });

    act(() => {
      vi.advanceTimersByTime(HIDE_MS);
    });
    expect(result.current.showPicker).toBe(false);
  });

  it('openPicker mở ngay không chờ openMs', () => {
    const { result } = renderHook(() => useReactionPickerHover(OPEN_MS, HIDE_MS));

    act(() => {
      result.current.openPicker();
    });
    expect(result.current.showPicker).toBe(true);
  });

  it('closePicker đóng ngay và hủy timer đang chờ', () => {
    const { result } = renderHook(() => useReactionPickerHover(OPEN_MS, HIDE_MS));

    act(() => {
      result.current.openPicker();
      result.current.scheduleHidePicker();
      result.current.closePicker();
    });
    expect(result.current.showPicker).toBe(false);

    act(() => {
      vi.advanceTimersByTime(HIDE_MS);
    });
    expect(result.current.showPicker).toBe(false);
  });
});

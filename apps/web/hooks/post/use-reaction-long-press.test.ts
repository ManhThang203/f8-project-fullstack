import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useReactionLongPress } from './use-reaction-long-press';

const MS = 400;

describe('useReactionLongPress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('không mở khi giữ ngắn hơn ms', () => {
    const openPicker = vi.fn();
    const { result } = renderHook(() => useReactionLongPress(openPicker, MS));

    act(() => {
      result.current.onPointerDown();
    });
    act(() => {
      vi.advanceTimersByTime(MS - 1);
    });
    expect(openPicker).not.toHaveBeenCalled();

    act(() => {
      result.current.onPointerUp();
    });
    act(() => {
      vi.advanceTimersByTime(MS);
    });
    expect(openPicker).not.toHaveBeenCalled();
  });

  it('mở sau đúng ms khi dí giữ', () => {
    const openPicker = vi.fn();
    const { result } = renderHook(() => useReactionLongPress(openPicker, MS));

    act(() => {
      result.current.onPointerDown();
    });
    act(() => {
      vi.advanceTimersByTime(MS);
    });
    expect(openPicker).toHaveBeenCalledTimes(1);
  });

  it('hủy timer khi pointerup sớm', () => {
    const openPicker = vi.fn();
    const { result } = renderHook(() => useReactionLongPress(openPicker, MS));

    act(() => {
      result.current.onPointerDown();
      result.current.onPointerUp();
    });
    act(() => {
      vi.advanceTimersByTime(MS);
    });
    expect(openPicker).not.toHaveBeenCalled();
  });

  it('hủy timer khi pointerleave / pointercancel', () => {
    const openPicker = vi.fn();
    const { result } = renderHook(() => useReactionLongPress(openPicker, MS));

    act(() => {
      result.current.onPointerDown();
      result.current.onPointerLeave();
    });
    act(() => {
      vi.advanceTimersByTime(MS);
    });
    expect(openPicker).not.toHaveBeenCalled();

    act(() => {
      result.current.onPointerDown();
      result.current.onPointerCancel();
    });
    act(() => {
      vi.advanceTimersByTime(MS);
    });
    expect(openPicker).not.toHaveBeenCalled();
  });

  it('guardClick bỏ qua click sau khi vừa mở bằng long-press', () => {
    const openPicker = vi.fn();
    const like = vi.fn();
    const { result } = renderHook(() => useReactionLongPress(openPicker, MS));

    act(() => {
      result.current.onPointerDown();
    });
    act(() => {
      vi.advanceTimersByTime(MS);
    });

    const guarded = result.current.guardClick(like);
    act(() => {
      guarded();
    });
    expect(like).not.toHaveBeenCalled();

    act(() => {
      guarded();
    });
    expect(like).toHaveBeenCalledTimes(1);
  });

  it('guardClick gọi handler bình thường nếu không long-press', () => {
    const openPicker = vi.fn();
    const like = vi.fn();
    const { result } = renderHook(() => useReactionLongPress(openPicker, MS));

    act(() => {
      result.current.onPointerDown();
      result.current.onPointerUp();
    });

    const guarded = result.current.guardClick(like);
    act(() => {
      guarded();
    });
    expect(like).toHaveBeenCalledTimes(1);
  });
});

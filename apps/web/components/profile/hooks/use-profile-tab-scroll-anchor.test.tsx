import type { ProfileTab } from '@/components/profile/profile-utils';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useProfileTabScrollAnchor } from '@/components/profile/hooks/use-profile-tab-scroll-anchor';

function rect(top: number): DOMRect {
  return {
    top,
    left: 0,
    right: 0,
    bottom: top + 44,
    width: 600,
    height: 44,
    x: 0,
    y: top,
    toJSON: () => ({}),
  };
}

describe('useProfileTabScrollAnchor', () => {
  let rafQueue: FrameRequestCallback[];

  beforeEach(() => {
    rafQueue = [];
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    Object.defineProperty(window, 'scrollY', { value: 800, writable: true, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  /** Chạy lần lượt các callback rAF đã queue (thường double rAF). */
  function flushRaf(times = 2) {
    for (let i = 0; i < times; i += 1) {
      const cb = rafQueue.shift();
      cb?.(0);
    }
  }

  it('neo scroll và giữ minHeight khi đổi tab lúc tabs sticky', () => {
    const { result, rerender } = renderHook(
      ({ tab }: { tab: ProfileTab }) => useProfileTabScrollAnchor(tab),
      { initialProps: { tab: 'posts' as ProfileTab } },
    );

    const tabsEl = document.createElement('div');
    vi.spyOn(tabsEl, 'getBoundingClientRect').mockReturnValue(rect(56));

    const panelEl = document.createElement('div');
    Object.defineProperty(panelEl, 'offsetHeight', { value: 2000, configurable: true });
    result.current.panelRef.current = panelEl;

    act(() => {
      result.current.captureBeforeTabChange(tabsEl);
    });

    expect(panelEl.style.minHeight).toBe('2000px');

    rerender({ tab: 'reels' });

    expect(window.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ top: 800, behavior: 'instant' }),
    );

    act(() => {
      flushRaf(2);
    });

    expect(panelEl.style.minHeight).toBe('');
  });

  it('không capture khi chưa cuộn sâu', () => {
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });

    const { result } = renderHook(() => useProfileTabScrollAnchor('posts'));

    const tabsEl = document.createElement('div');
    vi.spyOn(tabsEl, 'getBoundingClientRect').mockReturnValue(rect(300));

    const panelEl = document.createElement('div');
    Object.defineProperty(panelEl, 'offsetHeight', { value: 200, configurable: true });
    result.current.panelRef.current = panelEl;

    act(() => {
      result.current.captureBeforeTabChange(tabsEl);
    });

    expect(panelEl.style.minHeight).toBe('');
  });

  it('dọn minHeight khi unmount', () => {
    const { result, unmount } = renderHook(() => useProfileTabScrollAnchor('posts'));

    const tabsEl = document.createElement('div');
    vi.spyOn(tabsEl, 'getBoundingClientRect').mockReturnValue(rect(56));

    const panelEl = document.createElement('div');
    Object.defineProperty(panelEl, 'offsetHeight', { value: 1500, configurable: true });
    result.current.panelRef.current = panelEl;

    act(() => {
      result.current.captureBeforeTabChange(tabsEl);
    });

    expect(panelEl.style.minHeight).toBe('1500px');

    unmount();

    expect(panelEl.style.minHeight).toBe('');
  });
});

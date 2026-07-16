import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProfileTab } from '@/components/profile/profile-utils';
import { useProfileTabHeightPlaceholder } from '@/components/profile/hooks/use-profile-tab-height-placeholder';

describe('useProfileTabHeightPlaceholder', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    Object.defineProperty(window, 'scrollY', { value: 240, writable: true, configurable: true });
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('gán minHeight trước khi đổi tab và xóa sau khi tab mới mount', async () => {
    const panelEl = document.createElement('div');
    Object.defineProperty(panelEl, 'offsetHeight', { configurable: true, get: () => 900 });

    const { result, rerender } = renderHook(
      ({ tab }: { tab: ProfileTab }) => useProfileTabHeightPlaceholder(tab),
      { initialProps: { tab: 'posts' as ProfileTab } },
    );

    result.current.panelRef.current = panelEl;

    act(() => {
      result.current.captureBeforeTabChange();
    });

    expect(panelEl.style.minHeight).toBe('900px');

    rerender({ tab: 'reels' });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(panelEl.style.minHeight).toBe('');
  });

  it('không gán minHeight khi panel cao 0', () => {
    const panelEl = document.createElement('div');
    Object.defineProperty(panelEl, 'offsetHeight', { configurable: true, get: () => 0 });

    const { result } = renderHook(() => useProfileTabHeightPlaceholder('posts'));
    result.current.panelRef.current = panelEl;

    act(() => {
      result.current.captureBeforeTabChange();
    });

    expect(panelEl.style.minHeight).toBe('');
  });
});

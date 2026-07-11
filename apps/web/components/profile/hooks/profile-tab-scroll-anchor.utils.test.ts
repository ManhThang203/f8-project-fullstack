import { describe, expect, it } from 'vitest';

import {
  SITE_HEADER_OFFSET,
  applyPanelMinHeight,
  clearPanelMinHeight,
  computeTabScrollTarget,
  resolveStickyHeaderOffset,
  shouldCaptureTabScrollAnchor,
} from '@/components/profile/hooks/profile-tab-scroll-anchor.utils';

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

describe('resolveStickyHeaderOffset', () => {
  it('dùng top đo được khi tabs đã sticky', () => {
    expect(resolveStickyHeaderOffset(rect(56))).toBe(56);
    expect(resolveStickyHeaderOffset(rect(55.5))).toBe(55.5);
  });

  it('fallback h-14 khi tabs chưa sticky', () => {
    expect(resolveStickyHeaderOffset(rect(120))).toBe(SITE_HEADER_OFFSET);
  });
});

describe('computeTabScrollTarget', () => {
  it('tính scrollY để tabs dính dưới header', () => {
    expect(computeTabScrollTarget(rect(56), 800)).toBe(800);
    expect(computeTabScrollTarget(rect(120), 400)).toBe(464);
  });

  it('không trả về số âm', () => {
    expect(computeTabScrollTarget(rect(10), 0)).toBe(0);
  });
});

describe('shouldCaptureTabScrollAnchor', () => {
  it('capture khi tabs sticky', () => {
    expect(shouldCaptureTabScrollAnchor(rect(56), 800, 200, 900)).toBe(true);
  });

  it('capture khi chưa sticky nhưng panel cao (cuộn sâu)', () => {
    expect(shouldCaptureTabScrollAnchor(rect(120), 500, 2000, 800)).toBe(true);
  });

  it('bỏ qua khi chưa cuộn và panel ngắn', () => {
    expect(shouldCaptureTabScrollAnchor(rect(300), 0, 200, 800)).toBe(false);
  });
});

describe('panel minHeight helpers', () => {
  it('apply và clear minHeight inline', () => {
    const panel = document.createElement('div');
    applyPanelMinHeight(panel, 1200);
    expect(panel.style.minHeight).toBe('1200px');
    clearPanelMinHeight(panel);
    expect(panel.style.minHeight).toBe('');
  });

  it('bỏ qua panel null hoặc height không dương', () => {
    const panel = document.createElement('div');
    applyPanelMinHeight(panel, 0);
    expect(panel.style.minHeight).toBe('');
    clearPanelMinHeight(null);
  });
});

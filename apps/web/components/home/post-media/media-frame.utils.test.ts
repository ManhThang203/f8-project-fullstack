import { describe, expect, it } from 'vitest';

import {
  clampAspect,
  getFrameAspectFromSize,
  MAX_ASPECT,
  MIN_ASPECT,
  resolveFrameAspectRatio,
} from './media-frame.utils';

describe('clampAspect', () => {
  it('keeps ratio inside 4:5 … 16:9', () => {
    expect(clampAspect(1)).toBe(1);
    expect(clampAspect(4 / 5)).toBe(MIN_ASPECT);
    expect(clampAspect(16 / 9)).toBe(MAX_ASPECT);
  });

  it('clamps taller-than-4:5 down to MIN_ASPECT', () => {
    expect(clampAspect(9 / 16)).toBe(MIN_ASPECT);
  });

  it('clamps wider-than-16:9 up to MAX_ASPECT', () => {
    expect(clampAspect(21 / 9)).toBe(MAX_ASPECT);
  });
});

describe('getFrameAspectFromSize', () => {
  it('returns width/height when both valid', () => {
    expect(getFrameAspectFromSize(1080, 1350)).toBeCloseTo(1080 / 1350);
  });

  it('returns null when missing or non-positive', () => {
    expect(getFrameAspectFromSize(null, 100)).toBeNull();
    expect(getFrameAspectFromSize(100, null)).toBeNull();
    expect(getFrameAspectFromSize(0, 100)).toBeNull();
    expect(getFrameAspectFromSize(100, 0)).toBeNull();
    expect(getFrameAspectFromSize(undefined, undefined)).toBeNull();
  });
});

describe('resolveFrameAspectRatio', () => {
  it('falls back to 1 when metadata missing', () => {
    expect(resolveFrameAspectRatio(null, null)).toBe(1);
  });

  it('returns clamped ratio for extreme sizes', () => {
    expect(resolveFrameAspectRatio(1080, 1920)).toBe(MIN_ASPECT);
    expect(resolveFrameAspectRatio(1920, 800)).toBe(MAX_ASPECT);
  });

  it('returns raw ratio when already in range', () => {
    expect(resolveFrameAspectRatio(1000, 1000)).toBe(1);
  });
});

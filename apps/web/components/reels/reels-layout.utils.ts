'use client';

import { useEffect, useState } from 'react';

export type ReelsLayoutMode = 'immersive' | 'stage';
export type ReelsDeviceProfile = 'mobile' | 'tablet' | 'desktop';

/** Breakpoint lg — immersive dưới 1024px, stage từ 1024px trở lên. */
export const REELS_STAGE_MIN_WIDTH_QUERY = '(min-width: 1024px)';
export const REELS_TABLET_MIN_QUERY = '(min-width: 768px)';
export const REELS_TABLET_MAX_QUERY = '(max-width: 1023px)';

function resolveLayoutMode(matches: boolean): ReelsLayoutMode {
  return matches ? 'stage' : 'immersive';
}

/** Xác định profile thiết bị từ viewport width. */
function resolveDeviceProfile(): ReelsDeviceProfile {
  if (typeof window === 'undefined') return 'mobile';
  if (window.matchMedia(REELS_STAGE_MIN_WIDTH_QUERY).matches) return 'desktop';
  if (window.matchMedia(REELS_TABLET_MIN_QUERY).matches) return 'tablet';
  return 'mobile';
}

/** Subscribe viewport và trả về chế độ layout Reels (immersive | stage). */
export function useReelsLayoutMode(): ReelsLayoutMode {
  const [layoutMode, setLayoutMode] = useState<ReelsLayoutMode>(() => {
    if (typeof window === 'undefined') return 'immersive';
    return resolveLayoutMode(window.matchMedia(REELS_STAGE_MIN_WIDTH_QUERY).matches);
  });

  useEffect(() => {
    const mq = window.matchMedia(REELS_STAGE_MIN_WIDTH_QUERY);
    const update = () => setLayoutMode(resolveLayoutMode(mq.matches));
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return layoutMode;
}

/** Subscribe viewport và trả về profile thiết bị (mobile | tablet | desktop). */
export function useReelsDeviceProfile(): ReelsDeviceProfile {
  const [profile, setProfile] = useState<ReelsDeviceProfile>(resolveDeviceProfile);

  useEffect(() => {
    const desktopMq = window.matchMedia(REELS_STAGE_MIN_WIDTH_QUERY);
    const tabletMq = window.matchMedia(REELS_TABLET_MIN_QUERY);

    const update = () => setProfile(resolveDeviceProfile());
    update();

    desktopMq.addEventListener('change', update);
    tabletMq.addEventListener('change', update);
    return () => {
      desktopMq.removeEventListener('change', update);
      tabletMq.removeEventListener('change', update);
    };
  }, []);

  return profile;
}

export const SITE_HEADER_HEIGHT_REM = 3.5;
export const SITE_BOTTOM_NAV_HEIGHT_REM = 3.5;

/** Tính chiều cao slide Reels theo viewport và có bottom nav hay không. */
function buildReelsSlideHeight(hasBottomNav: boolean): string {
  if (typeof window !== 'undefined' && window.matchMedia(REELS_STAGE_MIN_WIDTH_QUERY).matches) {
    return `calc(100dvh - ${SITE_HEADER_HEIGHT_REM}rem)`;
  }
  if (hasBottomNav) {
    return `calc(100dvh - ${SITE_BOTTOM_NAV_HEIGHT_REM}rem - env(safe-area-inset-bottom, 0px))`;
  }
  return '100dvh';
}

/** Hook trả về chiều cao slide Reels (desktop trừ header; mobile/tablet trừ bottom nav nếu có). */
export function useReelsSlideHeight(hasBottomNav: boolean): string {
  const [height, setHeight] = useState(() =>
    typeof window === 'undefined'
      ? hasBottomNav
        ? `calc(100dvh - ${SITE_BOTTOM_NAV_HEIGHT_REM}rem - env(safe-area-inset-bottom, 0px))`
        : '100dvh'
      : buildReelsSlideHeight(hasBottomNav),
  );

  useEffect(() => {
    const mq = window.matchMedia(REELS_STAGE_MIN_WIDTH_QUERY);
    const update = () => setHeight(buildReelsSlideHeight(hasBottomNav));
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [hasBottomNav]);

  return height;
}

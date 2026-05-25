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

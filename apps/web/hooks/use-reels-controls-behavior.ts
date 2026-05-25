'use client';

import { useCallback, useEffect, useState } from 'react';

import type { ReelsDeviceProfile } from '@/components/reels/reels-layout.utils';

type Options = {
  deviceProfile: ReelsDeviceProfile;
  isActive: boolean;
  togglePlay: () => void;
};

/** Quản lý state tap controls Reels theo profile thiết bị (mobile/tablet/desktop). */
export function useReelsControlsBehavior({ deviceProfile, isActive, togglePlay }: Options) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const [volumeSliderOpen, setVolumeSliderOpen] = useState(false);

  useEffect(() => {
    if (isActive) {
      setControlsVisible(true);
      setVolumeSliderOpen(false);
    }
  }, [isActive]);

  const handleVideoTap = useCallback(() => {
    if (deviceProfile === 'tablet') {
      setControlsVisible((prev) => !prev);
      setVolumeSliderOpen(false);
      return;
    }
    togglePlay();
  }, [deviceProfile, togglePlay]);

  const handleVolumeIconTap = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setVolumeSliderOpen((prev) => !prev);
  }, []);

  const closeVolumeSlider = useCallback(() => {
    setVolumeSliderOpen(false);
  }, []);

  return {
    controlsVisible,
    volumeSliderOpen,
    setVolumeSliderOpen,
    handleVideoTap,
    handleVolumeIconTap,
    closeVolumeSlider,
  };
}

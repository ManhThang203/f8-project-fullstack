'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type ReelsAudioContextValue = {
  volume: number;
  muted: boolean;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
};

const ReelsAudioContext = createContext<ReelsAudioContextValue | null>(null);

function clampVolume(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function ReelsAudioProvider({ children }: { children: ReactNode }) {
  const [volume, setVolumeState] = useState(1);
  const [muted, setMuted] = useState(false);

  const setVolume = useCallback((next: number) => {
    const clamped = clampVolume(next);
    setVolumeState(clamped);
    if (clamped === 0) setMuted(true);
    else setMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      if (prev) {
        setVolumeState((v) => (v === 0 ? 1 : v));
        return false;
      }
      return true;
    });
  }, []);

  const value = useMemo(
    () => ({ volume, muted, setVolume, toggleMute }),
    [volume, muted, setVolume, toggleMute],
  );

  return <ReelsAudioContext.Provider value={value}>{children}</ReelsAudioContext.Provider>;
}

export function useReelsAudio() {
  const ctx = useContext(ReelsAudioContext);
  if (!ctx) {
    throw new Error('useReelsAudio must be used within ReelsAudioProvider');
  }
  return ctx;
}

export function applyReelsAudio(video: HTMLVideoElement, volume: number, muted: boolean) {
  video.volume = clampVolume(volume);
  video.muted = muted || volume === 0;
}

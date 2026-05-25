'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { feedVideoController } from '@/lib/feed-video-controller';

type Options = {
  initialDurationMs?: number | null;
};

function clampVolume(value: number) {
  return Math.max(0, Math.min(1, value));
}

/** Áp volume/mute lên phần tử video. */
function applyFeedVideoAudio(video: HTMLVideoElement, volume: number, muted: boolean) {
  video.volume = clampVolume(volume);
  video.muted = muted || volume === 0;
}

/**
 * Playback feed video: autoplay tắt tiếng khi ≥50% visible,
 * pause khi cuộn ra, chỉ 1 video phát, mute/volume per-video.
 */
export function useFeedPostVideo(options?: Options) {
  const initialDurationMs = options?.initialDurationMs ?? 0;

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const userPausedRef = useRef(false);
  const isAutoPausingRef = useRef(false);
  const volumeRef = useRef(1);
  const mutedRef = useRef(true);

  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolumeState] = useState(1);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(initialDurationMs > 0 ? initialDurationMs : 0);

  volumeRef.current = volume;
  mutedRef.current = muted;

  const play = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    applyFeedVideoAudio(v, volume, muted);
    v.play().catch(() => {
      v.muted = true;
      setMuted(true);
      v.play().catch(() => {});
    });
    feedVideoController.setCurrent(v);
  }, [volume, muted]);

  const pause = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      userPausedRef.current = false;
      play();
    } else {
      userPausedRef.current = true;
      pause();
    }
  }, [play, pause]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (!next) setVolumeState((v) => (v === 0 ? 1 : v));
      return next;
    });
  }, []);

  const setVolume = useCallback((next: number) => {
    const clamped = clampVolume(next);
    setVolumeState(clamped);
    if (clamped === 0) setMuted(true);
    else setMuted(false);
  }, []);

  /** Tua video theo mili-giây. */
  const handleSeek = useCallback((timeMs: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = timeMs / 1000;
    setCurrentTimeMs(timeMs);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        const visible = entry.intersectionRatio >= 0.5;
        const v = videoRef.current;
        if (!v) return;

        if (!visible && !v.paused) {
          isAutoPausingRef.current = true;
          v.pause();
        } else if (visible && !userPausedRef.current && v.paused) {
          applyFeedVideoAudio(v, volumeRef.current, mutedRef.current);
          v.play().catch(() => {
            v.muted = true;
            setMuted(true);
            v.play().catch(() => {});
          });
          feedVideoController.setCurrent(v);
        }
      },
      { threshold: [0, 0.5, 1] },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    applyFeedVideoAudio(v, volume, muted);
  }, [volume, muted]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    function onPlay() {
      setIsPlaying(true);
    }

    function onPause() {
      if (isAutoPausingRef.current) {
        isAutoPausingRef.current = false;
        setIsPlaying(false);
        return;
      }
      if (feedVideoController.consumeControllerPause()) {
        setIsPlaying(false);
        return;
      }
      userPausedRef.current = true;
      setIsPlaying(false);
    }

    function onTimeUpdate() {
      setCurrentTimeMs(v!.currentTime * 1000);
      if (v!.duration && !Number.isNaN(v!.duration)) {
        setDurationMs(v!.duration * 1000);
      }
    }

    function onLoadedMetadata() {
      if (v!.duration && !Number.isNaN(v!.duration)) {
        setDurationMs(v!.duration * 1000);
      }
    }

    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('loadedmetadata', onLoadedMetadata);
      feedVideoController.clear(v);
    };
  }, []);

  return {
    containerRef,
    videoRef,
    isPlaying,
    muted,
    volume,
    togglePlay,
    toggleMute,
    setVolume,
    currentTimeMs,
    durationMs,
    handleSeek,
  };
}

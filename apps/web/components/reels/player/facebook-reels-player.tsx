'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useFollowMutation } from '@/hooks/queries/use-follow-mutation';
import { useReelsControlsBehavior } from '@/hooks/use-reels-controls-behavior';
import { useReelsVideoStage } from '@/hooks/use-reels-video-stage';
import { useReelsDeviceProfile, useReelsLayoutMode, type ReelsDeviceProfile } from '../reels-layout.utils';
import { authClient } from '@/lib/auth-client';
import { feedVideoController } from '@/lib/feed-video-controller';
import { cn } from '@/lib/utils';

import { ReelsActionRail } from '../controls/reels-action-rail';
import { ReelsCenterPlayIndicator } from '../controls/reels-center-play-indicator';
import { ReelsProgressBar } from '../controls/reels-progress-bar';
import type { ReelsVolumeVariant } from '../controls/reels-volume-control';
import { ReelsTopControls } from '../controls/reels-top-controls';
import { ReelsBottomMeta } from '../meta/reels-bottom-meta';
import { applyReelsAudio, useReelsAudio } from '../reels-audio-context';
import type { ReelsPlayerProps } from '../reels-types';
import { ReelsVideoSurface } from './reels-video-surface';

const TIMEUPDATE_THROTTLE_MS = 250;

function getVolumeVariant(profile: ReelsDeviceProfile): ReelsVolumeVariant {
  if (profile === 'mobile') return 'toggle-only';
  if (profile === 'tablet') return 'tap-slider';
  return 'hover-slider';
}

export function FacebookReelsPlayer({ item, isActive }: ReelsPlayerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastTimeUpdateRef = useRef(0);
  const { data: session } = authClient.useSession();

  const layoutMode = useReelsLayoutMode();
  const deviceProfile = useReelsDeviceProfile();
  const isImmersive = layoutMode === 'immersive';
  const isTablet = deviceProfile === 'tablet';
  const isMobile = deviceProfile === 'mobile';

  const placeholderVideoSize = useMemo(() => {
    const { width, height } = item.video;
    if (width && height && width > 0 && height > 0) {
      return { width, height };
    }
    return { width: 9, height: 16 };
  }, [item.video.width, item.video.height]);

  const { containerRef, onVideoSizeChange, stageClassName, stageStyle } = useReelsVideoStage(
    item.video.url,
    { layoutMode, placeholderVideoSize },
  );

  const userPausedRef = useRef(false);
  const volumeRef = useRef(1);
  const mutedRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const { volume, muted, setVolume, toggleMute } = useReelsAudio();
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(item.video.durationMs ?? 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(item.isFollowing);

  const followMutation = useFollowMutation({
    onError: (err) => toast.error(err.message),
  });

  const isOwnReel = session?.user?.id === item.author.id;

  volumeRef.current = volume;
  mutedRef.current = muted;

  const play = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    applyReelsAudio(v, volume, muted);
    v.play().catch(() => {
      v.muted = true;
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

  const {
    controlsVisible,
    volumeSliderOpen,
    setVolumeSliderOpen,
    handleVideoTap,
    handleVolumeIconTap,
  } = useReelsControlsBehavior({ deviceProfile, isActive, togglePlay });

  const controlsChromeVisible = !isTablet || controlsVisible;
  const volumeVariant = getVolumeVariant(deviceProfile);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (isActive) {
      if (!userPausedRef.current) {
        applyReelsAudio(v, volumeRef.current, mutedRef.current);
        v.play().catch(() => {
          v.muted = true;
          v.play().catch(() => {});
        });
        feedVideoController.setCurrent(v);
      }
    } else {
      v.pause();
    }

    return () => {
      feedVideoController.clear(v);
    };
  }, [isActive]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    applyReelsAudio(v, volume, muted);
  }, [volume, muted]);

  useEffect(() => {
    setIsFollowing(item.isFollowing);
  }, [item.id, item.isFollowing]);

  function onVideoPlay() {
    setIsPlaying(true);
  }

  function onVideoPause() {
    setIsPlaying(false);
  }

  function onTimeUpdate() {
    const v = videoRef.current;
    if (!v) return;

    const now = Date.now();
    if (now - lastTimeUpdateRef.current >= TIMEUPDATE_THROTTLE_MS) {
      lastTimeUpdateRef.current = now;
      setCurrentTimeMs(v.currentTime * 1000);
    }

    if (v.duration && !isNaN(v.duration)) {
      setDurationMs(v.duration * 1000);
    }
  }

  function onLoadedMetadata() {
    const v = videoRef.current;
    if (v && !isNaN(v.duration)) setDurationMs(v.duration * 1000);
  }

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.addEventListener('play', onVideoPlay);
    v.addEventListener('pause', onVideoPause);
    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('loadedmetadata', onLoadedMetadata);
    return () => {
      v.removeEventListener('play', onVideoPlay);
      v.removeEventListener('pause', onVideoPause);
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, []);

  function handleTogglePlay(e: React.MouseEvent) {
    e.stopPropagation();
    togglePlay();
  }

  function handleToggleMute(e: React.MouseEvent) {
    e.stopPropagation();
    toggleMute();
  }

  function handleVolumeChange(nextVolume: number) {
    setVolume(nextVolume);
  }

  function handleSearch(e: React.MouseEvent) {
    e.stopPropagation();
    toast.message('Tìm kiếm — tính năng sắp có');
  }

  function handleSeek(timeMs: number) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = timeMs / 1000;
    setCurrentTimeMs(timeMs);
    lastTimeUpdateRef.current = Date.now();
  }

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    setIsLiked((prev) => !prev);
  }

  function handleComment(e: React.MouseEvent) {
    e.stopPropagation();
    toast.message('Bình luận — tính năng sắp có');
  }

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    toast.message('Chia sẻ — tính năng sắp có');
  }

  function handleSave(e: React.MouseEvent) {
    e.stopPropagation();
    toast.message('Lưu — tính năng sắp có');
  }

  function handleMore(e: React.MouseEvent) {
    e.stopPropagation();
    toast.message('Thêm tuỳ chọn — tính năng sắp có');
  }

  function handleAvatarClick(e: React.MouseEvent) {
    e.stopPropagation();
    router.push(`/${item.author.username}`);
  }

  function handleFollowClick() {
    if (followMutation.isPending || isOwnReel) return;

    const next = !isFollowing;
    const prev = isFollowing;
    setIsFollowing(next);

    followMutation.mutate(
      { userId: item.author.id, follow: next },
      {
        onSuccess: (data) => setIsFollowing(data.isFollowing),
        onError: () => setIsFollowing(prev),
      },
    );
  }

  function handleStageMouseLeave() {
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.closest('.reels-stage-controls')) {
      active.blur();
    }
  }

  const railProps = {
    isLiked,
    onLike: handleLike,
    onComment: handleComment,
    onShare: handleShare,
    onSave: handleSave,
    onMore: handleMore,
  };

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black"
    >
      <div className={cn('flex items-center', isImmersive ? 'h-full w-full' : 'gap-4 lg:gap-5')}>
        <div
          className={cn(
            stageClassName,
            'group/stage',
            isImmersive && 'reels-stage-immersive h-full w-full',
          )}
          style={stageStyle}
          onMouseLeave={handleStageMouseLeave}
        >
          <ReelsVideoSurface
            src={item.video.url}
            videoRef={videoRef}
            onVideoTap={handleVideoTap}
            onVideoSizeChange={onVideoSizeChange}
            objectFit={isImmersive ? 'cover' : 'contain'}
            preload={isActive ? 'metadata' : 'none'}
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {isMobile && !isPlaying ? <ReelsCenterPlayIndicator /> : null}

          <ReelsTopControls
            className="reels-stage-controls"
            isPlaying={isPlaying}
            volume={volume}
            muted={muted}
            showPlayButton={!isMobile}
            volumeVariant={volumeVariant}
            volumeSliderOpen={volumeSliderOpen}
            onVolumeSliderOpenChange={setVolumeSliderOpen}
            visible={controlsChromeVisible}
            onTogglePlay={handleTogglePlay}
            onVolumeChange={handleVolumeChange}
            onToggleMute={handleToggleMute}
            onVolumeIconTap={handleVolumeIconTap}
            onSearch={handleSearch}
          />

          <ReelsBottomMeta
            author={item.author}
            caption={item.content}
            isFollowing={isFollowing}
            onFollowClick={isOwnReel ? undefined : handleFollowClick}
            followLoading={followMutation.isPending}
            onAvatarClick={handleAvatarClick}
            layoutMode={layoutMode}
          />

          {durationMs > 0 && (
            <ReelsProgressBar
              className="reels-stage-controls"
              currentTimeMs={currentTimeMs}
              durationMs={durationMs}
              onSeek={handleSeek}
              visible={controlsChromeVisible}
            />
          )}

          {isImmersive ? (
            <ReelsActionRail
              {...railProps}
              className="reels-immersive-rail absolute bottom-16 right-2 pb-[env(safe-area-inset-bottom)]"
            />
          ) : null}
        </div>

        {!isImmersive ? (
          <ReelsActionRail {...railProps} className="mr-2 shrink-0 lg:mr-4" />
        ) : null}
      </div>
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useFollowMutation } from '@/hooks/queries/use-follow-mutation';
import { useReelsVideoStage } from '@/hooks/use-reels-video-stage';
import { authClient } from '@/lib/auth-client';
import { feedVideoController } from '@/lib/feed-video-controller';
import { cn } from '@/lib/utils';

import { ReelsActionRail } from './reels-action-rail';
import { applyReelsAudio, useReelsAudio } from './reels-audio-context';
import { ReelsBottomMeta } from './reels-bottom-meta';
import { ReelsProgressBar } from './reels-progress-bar';
import { ReelsTopControls } from './reels-top-controls';
import { ReelsVideoSurface } from './reels-video-surface';
import type { ReelsPlayerProps } from './reels-types';

export function FacebookReelsPlayer({ item, isActive }: ReelsPlayerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { data: session } = authClient.useSession();

  const {
    containerRef,
    onVideoSizeChange,
    stageClassName,
    stageStyle,
  } = useReelsVideoStage(item.video.url);

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
    if (v.paused) play();
    else pause();
  }, [play, pause]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (isActive) {
      applyReelsAudio(v, volume, muted);
      play();
    } else {
      pause();
    }

    return () => {
      feedVideoController.clear(v);
    };
  }, [isActive, volume, muted, play, pause]);

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
    setCurrentTimeMs(v.currentTime * 1000);
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
      <div className="flex items-center gap-4 md:gap-5">
        <div
          className={cn(stageClassName, 'group/stage')}
          style={stageStyle}
          onMouseLeave={handleStageMouseLeave}
        >
          <ReelsVideoSurface
            src={item.video.url}
            videoRef={videoRef}
            onTogglePlay={togglePlay}
            onVideoSizeChange={onVideoSizeChange}
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          <ReelsTopControls
            className="reels-stage-controls"
            isPlaying={isPlaying}
            volume={volume}
            muted={muted}
            onTogglePlay={handleTogglePlay}
            onVolumeChange={handleVolumeChange}
            onToggleMute={handleToggleMute}
            onSearch={handleSearch}
          />

          <ReelsBottomMeta
            author={item.author}
            caption={item.content}
            isFollowing={isFollowing}
            onFollowClick={isOwnReel ? undefined : handleFollowClick}
            followLoading={followMutation.isPending}
            onAvatarClick={handleAvatarClick}
          />

          {durationMs > 0 && (
            <ReelsProgressBar
              className="reels-stage-controls"
              currentTimeMs={currentTimeMs}
              durationMs={durationMs}
              src={item.video.url}
              onSeek={handleSeek}
            />
          )}

          <ReelsActionRail {...railProps} className="absolute bottom-16 right-2 md:hidden" />
        </div>

        <ReelsActionRail {...railProps} className="hidden shrink-0 md:flex" />
      </div>
    </div>
  );
}

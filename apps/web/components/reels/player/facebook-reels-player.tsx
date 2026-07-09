'use client';

import { ReelsActionRail } from '../controls/reels-action-rail';
import { ReelsCenterPlayIndicator } from '../controls/reels-center-play-indicator';
import { ReelsProgressBar } from '../controls/reels-progress-bar';
import { ReelsTopControls } from '../controls/reels-top-controls';
import { ReelsBottomMeta } from '../meta/reels-bottom-meta';
import type { ReelsPlayerProps } from '../reels-types';

import { ReelsVideoSurface } from './reels-video-surface';
import { useFacebookReelsPlayer } from './use-facebook-reels-player';

import { PostDetailModal } from '@/components/home/post/detail';
import { cn } from '@/lib/utils';

export function FacebookReelsPlayer({
  item,
  isActive,
  currentUserId,
  currentUser,
}: ReelsPlayerProps) {
  const {
    containerRef,
    videoRef,
    layoutMode,
    isImmersive,
    isMobile,
    immersiveObjectFit,
    stageClassName,
    stageStyle,
    isPlaying,
    volume,
    muted,
    volumeVariant,
    volumeSliderOpen,
    setVolumeSliderOpen,
    controlsChromeVisible,
    currentTimeMs,
    durationMs,
    isFollowing,
    isOwnReel,
    followPending,
    commentsOpen,
    setCommentsOpen,
    postForModal,
    me,
    railProps,
    onVideoSizeChange,
    handleVideoTap,
    handleStageMouseLeave,
    handleTogglePlay,
    handleToggleMute,
    handleVolumeChange,
    handleVolumeIconTap,
    handleSeek,
    handleFollowClick,
    handleAvatarClick,
  } = useFacebookReelsPlayer(item, isActive, { currentUserId, currentUser });

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
            objectFit={isImmersive ? immersiveObjectFit : 'contain'}
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
          />

          <ReelsBottomMeta
            author={item.author}
            caption={item.content}
            isFollowing={isFollowing}
            onFollowClick={isOwnReel ? undefined : handleFollowClick}
            followLoading={followPending}
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
              className="reels-immersive-rail absolute bottom-[4.5rem] right-2"
            />
          ) : null}
        </div>

        {!isImmersive ? <ReelsActionRail {...railProps} className="mr-2 shrink-0 lg:mr-4" /> : null}
      </div>

      {commentsOpen ? (
        <PostDetailModal
          open={commentsOpen}
          onClose={() => setCommentsOpen(false)}
          post={postForModal}
          me={me}
        />
      ) : null}
    </div>
  );
}

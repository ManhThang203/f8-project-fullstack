'use client';

import type { PostFeedItemDto } from '@costy/shared';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { ReelsVolumeVariant } from '../controls/reels-volume-control';
import { applyReelsAudio, useReelsAudio } from '../reels-audio-context';
import {
  useReelsDeviceProfile,
  useReelsLayoutMode,
  type ReelsDeviceProfile,
} from '../reels-layout.utils';
import type { ReelsFeedItemDto } from '../reels-types';

import { useReactPost } from '@/hooks/post';
import { useSharePost, useToggleSavePost } from '@/hooks/queries/posts';
import { useFollowMutation } from '@/hooks/queries/social';
import { useReelsControlsBehavior, useReelsVideoStage } from '@/hooks/reels';
import { getUserFacingErrorMessage } from '@/lib/api';
import { consumeUnmuteOnEntry, feedVideoController } from '@/lib/post';

const TIMEUPDATE_THROTTLE_MS = 250;

type PlayerSessionContext = {
  currentUserId?: string;
  currentUser?: {
    id: string;
    username?: string | null;
    name?: string | null;
    image?: string | null;
  } | null;
};

function getVolumeVariant(profile: ReelsDeviceProfile): ReelsVolumeVariant {
  if (profile === 'mobile') return 'toggle-only';
  if (profile === 'tablet') return 'tap-slider';
  return 'hover-slider';
}

/**
 * Toàn bộ state/refs/handler cho trình phát Reels kiểu Facebook.
 * Tách khỏi component để phần JSX chỉ còn khai báo giao diện; hành vi giữ nguyên.
 */
export function useFacebookReelsPlayer(
  item: ReelsFeedItemDto,
  isActive: boolean,
  sessionContext: PlayerSessionContext = {},
) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastTimeUpdateRef = useRef(0);
  const { currentUserId, currentUser } = sessionContext;

  const layoutMode = useReelsLayoutMode();
  const deviceProfile = useReelsDeviceProfile();
  const isImmersive = layoutMode === 'immersive';
  const isTablet = deviceProfile === 'tablet';
  const isMobile = deviceProfile === 'mobile';
  const videoWidth = item.video.width;
  const videoHeight = item.video.height;

  const placeholderVideoSize = useMemo(() => {
    if (videoWidth && videoHeight && videoWidth > 0 && videoHeight > 0) {
      return { width: videoWidth, height: videoHeight };
    }
    return { width: 9, height: 16 };
  }, [videoWidth, videoHeight]);

  const { containerRef, onVideoSizeChange, stageClassName, stageStyle } = useReelsVideoStage(
    item.video.url,
    { layoutMode, placeholderVideoSize },
  );

  const volumeRef = useRef(1);
  const mutedRef = useRef(false);

  /** true khi user chủ động pause — dùng hiện center icon & chặn autoplay. */
  const [userPaused, setUserPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const { volume, muted, setVolume, setMuted, toggleMute } = useReelsAudio();
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(item.video.durationMs ?? 0);
  const [isLiked, setIsLiked] = useState(item.myReaction != null);
  const [likeCount, setLikeCount] = useState(item.likeCount);
  const [saved, setSaved] = useState(item.savedByMe);
  const [shareCount, setShareCount] = useState(item.shareCount);
  const [isFollowing, setIsFollowing] = useState(item.isFollowing);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const me = currentUser ?? undefined;

  const followMutation = useFollowMutation({
    onError: (err) => toast.error(getUserFacingErrorMessage(err)),
  });
  const reactMutation = useReactPost();
  const saveMutation = useToggleSavePost();
  const shareMutation = useSharePost();

  const isOwnReel = currentUserId === item.author.id;

  volumeRef.current = volume;
  mutedRef.current = muted;

  const play = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    applyReelsAudio(v, volumeRef.current, mutedRef.current);
    v.play().catch((err: unknown) => {
      // Chỉ tắt tiếng khi trình duyệt chặn autoplay có tiếng; lỗi khác (AbortError) thì bỏ qua.
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        v.muted = true;
        setMuted(true);
        v.play().catch(() => {});
      }
    });
    feedVideoController.setCurrent(v);
  }, [setMuted]);

  const pause = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  /** Toggle play/pause; giữ userPaused đến khi video thật sự play (tránh icon tắt sớm). */
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;

    if (v.paused) {
      play();
    } else {
      setUserPaused(true);
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

  // Vào Reels từ thao tác bấm video ở feed: ép bật tiếng cho phiên xem này.
  useEffect(() => {
    if (!isActive) return;

    if (consumeUnmuteOnEntry()) {
      setMuted(false);
      setVolume(1);
    }
  }, [isActive, setMuted, setVolume]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (isActive && !userPaused) {
      play();
    } else if (!isActive) {
      v.pause();
    }
  }, [isActive, play, userPaused]);

  // Chỉ clear controller khi đổi slide / unmount — không clear khi user pause.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !isActive) return;
    return () => {
      feedVideoController.clear(v);
    };
  }, [isActive, item.id]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    applyReelsAudio(v, volume, muted);
  }, [volume, muted]);

  useEffect(() => {
    setIsFollowing(item.isFollowing);
    setIsLiked(item.myReaction != null);
    setLikeCount(item.likeCount);
    setSaved(item.savedByMe);
    setShareCount(item.shareCount);
  }, [item.id, item.isFollowing, item.myReaction, item.likeCount, item.savedByMe, item.shareCount]);

  useEffect(() => {
    if (commentsOpen) {
      pause();
    } else if (isActive && !userPaused) {
      play();
    }
  }, [commentsOpen, isActive, pause, play, userPaused]);

  /** Map reel item sang PostFeedItemDto để mở modal bình luận. */
  const postForModal = useMemo<PostFeedItemDto>(
    () => ({
      id: item.id,
      parentId: null,
      content: item.content,
      createdAt: item.createdAt,
      visibility: 'PUBLIC',
      author: item.author,
      replyCount: item.replyCount,
      commentCount: item.commentCount ?? item.replyCount,
      likeCount,
      shareCount,
      myReaction: isLiked ? 'like' : null,
      savedByMe: saved,
      topReactions: item.topReactions ?? [],
      media: [item.video],
    }),
    [item, likeCount, shareCount, isLiked, saved],
  );

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    function onVideoPlay() {
      setIsPlaying(true);
      setUserPaused(false);
    }
    function onVideoPause() {
      setIsPlaying(false);
    }
    function onTimeUpdate() {
      const el = videoRef.current;
      if (!el) return;
      const now = Date.now();
      if (now - lastTimeUpdateRef.current >= TIMEUPDATE_THROTTLE_MS) {
        lastTimeUpdateRef.current = now;
        setCurrentTimeMs(el.currentTime * 1000);
      }
      if (el.duration && !isNaN(el.duration)) {
        setDurationMs(el.duration * 1000);
      }
    }
    function onLoadedMetadata() {
      const el = videoRef.current;
      if (el && !isNaN(el.duration)) setDurationMs(el.duration * 1000);
    }

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

  function handleSeek(timeMs: number) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = timeMs / 1000;
    setCurrentTimeMs(timeMs);
    lastTimeUpdateRef.current = Date.now();
  }

  /** Toggle thả tim cho reel qua API reactions, optimistic + revert khi lỗi. */
  function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !isLiked;
    const prevLiked = isLiked;
    const prevCount = likeCount;
    setIsLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    reactMutation.mutate(
      { postId: item.id, type: next ? 'like' : null },
      {
        onError: () => {
          setIsLiked(prevLiked);
          setLikeCount(prevCount);
          toast.error('Có lỗi xảy ra, vui lòng thử lại');
        },
      },
    );
  }

  function handleComment(e: React.MouseEvent) {
    e.stopPropagation();
    setCommentsOpen(true);
  }

  /** Chia sẻ reel: copy link + ghi nhận lượt chia sẻ ở backend. */
  async function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/reel/${item.id}`;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Costy', url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Đã sao chép liên kết');
      }
    } catch {
      /* cancelled */
    }
    shareMutation.mutate(item.id, {
      onSuccess: (data) => setShareCount(data.shareCount),
    });
  }

  /** Toggle lưu reel với optimistic update. */
  function handleSave(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !saved;
    setSaved(next);
    saveMutation.mutate(
      { postId: item.id, save: next },
      {
        onSuccess: (data) => {
          setSaved(data.savedByMe);
          toast.success(data.savedByMe ? 'Đã lưu' : 'Đã bỏ lưu');
        },
        onError: () => {
          setSaved(!next);
          toast.error('Có lỗi xảy ra, vui lòng thử lại');
        },
      },
    );
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
    saved,
    likeCount,
    commentCount: item.commentCount ?? item.replyCount,
    shareCount,
    onLike: handleLike,
    onComment: handleComment,
    onShare: (e: React.MouseEvent) => void handleShare(e),
    onSave: handleSave,
  };

  return {
    containerRef,
    videoRef,
    layoutMode,
    isImmersive,
    isMobile,
    stageClassName,
    stageStyle,
    isPlaying,
    userPaused,
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
    followPending: followMutation.isPending,
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
  };
}

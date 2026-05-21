'use client';

import { useEffect, useRef } from 'react';

import { feedVideoController } from '@/lib/feed-video-controller';

type Props = {
  src: string;
  className?: string;
};

/**
 * Video trong feed với hành vi kiểu Facebook:
 * - Không autoplay; user phải bấm play lần đầu.
 * - Sau khi play, video tự pause khi cuộn ra ngoài và resume khi cuộn vào.
 * - User chủ động bấm pause → không tự resume nữa cho đến khi play lại.
 * - Chỉ 1 video phát cùng lúc trên toàn trang.
 */
export function FeedVideo({ src, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // User đã từng kích hoạt video này và chưa chủ động dừng.
  // IO đọc cờ này để biết có nên auto-resume khi cuộn lại không.
  const wantsToPlayRef = useRef(false);

  // Bật ngay trước khi IO gọi pause(), giúp `onPause` phân biệt
  // pause do hệ thống vs pause do user bấm.
  const isAutoPausingRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        const visible = entry.intersectionRatio >= 0.5;

        if (!visible && !video.paused) {
          isAutoPausingRef.current = true;
          video.pause();
        } else if (visible && wantsToPlayRef.current && video.paused) {
          // Trình duyệt có thể từ chối play() (ví dụ chưa đủ user gesture);
          // nuốt rejection vì đây là trường hợp hợp lệ.
          video.play().catch(() => {});
        }
      },
      { threshold: [0, 0.5, 1] },
    );

    io.observe(video);

    return () => {
      io.disconnect();
      feedVideoController.clear(video);
    };
  }, []);

  function onPlay() {
    wantsToPlayRef.current = true;
    if (videoRef.current) feedVideoController.setCurrent(videoRef.current);
  }

  function onPause() {
    // IO vừa gọi pause() → tiêu thụ cờ và giữ ý định play cho lần cuộn sau.
    if (isAutoPausingRef.current) {
      isAutoPausingRef.current = false;
      return;
    }
    // Còn lại: user bấm pause, hoặc controller pause vì video khác play.
    wantsToPlayRef.current = false;
  }

  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      controls
      preload="metadata"
      playsInline
      onPlay={onPlay}
      onPause={onPause}
    />
  );
}

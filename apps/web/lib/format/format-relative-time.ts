type RelativeTimeOptions = {
  /** Nhãn khi < 60 giây. Mặc định: "Vừa xong" (chat). Post/comment: "Vừa đăng". */
  justNowLabel?: string;
};

/** Chuyển timestamp ISO sang chuỗi thời gian tương đối tiếng Việt. */
export function formatRelativeTime(timestamp: string, options?: RelativeTimeOptions): string {
  const justNowLabel = options?.justNowLabel ?? 'Vừa xong';
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffSeconds = Math.floor((now - then) / 1000);

  if (diffSeconds < 0) return justNowLabel;

  if (diffSeconds < 60) {
    return justNowLabel;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} phút`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} giờ`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} ngày`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks <= 3) {
    return `${diffWeeks} tuần`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  return `${Math.max(1, diffMonths)} tháng`;
}

/** Thời gian tương đối cho bài post / comment (< 60s → "Vừa đăng"). */
export function formatPostRelativeTime(timestamp: string): string {
  return formatRelativeTime(timestamp, { justNowLabel: 'Vừa đăng' });
}

/** Ngày giờ đầy đủ cho tooltip hover. */
export function formatAbsoluteTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

/** Text trạng thái hoạt động cho header chat 1-1. */
export function formatActivityStatus(
  peer: { isOnline?: boolean; lastSeenAt?: string | null } | undefined,
): string | null {
  if (!peer) return null;
  if (peer.isOnline) return 'Đang hoạt động';
  if (peer.lastSeenAt) return `Hoạt động ${formatRelativeTime(peer.lastSeenAt)} trước`;
  return null;
}

/** Khoảng tick (ms) để label tương đối tự cập nhật theo tuổi timestamp. */
export function getRelativeTimeTickMs(timestamp: string): number | null {
  const diffSeconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diffSeconds < 3600) return 30_000;
  if (diffSeconds < 86400) return 60_000;
  if (diffSeconds < 604_800) return 300_000;
  return null;
}

/** Chuyển timestamp ISO sang chuỗi thời gian tương đối tiếng Việt. */
export function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffSeconds = Math.floor((now - then) / 1000);

  if (diffSeconds < 0) return 'Vừa xong';

  if (diffSeconds < 60) {
    return 'Vừa xong';
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

/** Text trạng thái hoạt động cho header chat 1-1. */
export function formatActivityStatus(
  peer: { isOnline?: boolean; lastSeenAt?: string | null } | undefined,
): string | null {
  if (!peer) return null;
  if (peer.isOnline) return 'Đang hoạt động';
  if (peer.lastSeenAt) return `Hoạt động ${formatRelativeTime(peer.lastSeenAt)} trước`;
  return null;
}

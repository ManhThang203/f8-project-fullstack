export const PROFILE_AVATAR_UPDATED = 'costy:avatar-updated';

/** Phát sự kiện khi avatar vừa upload xong — header cập nhật ngay không chờ session. */
export function emitAvatarUpdated(url: string) {
  window.dispatchEvent(new CustomEvent(PROFILE_AVATAR_UPDATED, { detail: { url } }));
}

/** Lắng nghe avatar mới; trả hàm cleanup. */
export function subscribeAvatarUpdated(onUpdate: (url: string) => void) {
  function handler(event: Event) {
    const url = (event as CustomEvent<{ url?: string }>).detail?.url;
    if (url) onUpdate(url);
  }
  window.addEventListener(PROFILE_AVATAR_UPDATED, handler);
  return () => window.removeEventListener(PROFILE_AVATAR_UPDATED, handler);
}

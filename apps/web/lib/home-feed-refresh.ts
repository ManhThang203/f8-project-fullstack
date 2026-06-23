export const HOME_FEED_REFRESH = 'costy:home-feed-refresh';

/** Phát tín hiệu yêu cầu feed trang chủ cuộn lên đầu và tải lại dữ liệu mới. */
export function emitHomeFeedRefresh() {
  window.dispatchEvent(new CustomEvent(HOME_FEED_REFRESH));
}

/** Lắng nghe yêu cầu refresh feed trang chủ; trả hàm cleanup. */
export function onHomeFeedRefresh(callback: () => void) {
  window.addEventListener(HOME_FEED_REFRESH, callback);
  return () => window.removeEventListener(HOME_FEED_REFRESH, callback);
}

/** Xử lý click vào Home/logo: khi đang ở "/" thì chặn điều hướng, cuộn lên đầu và refresh feed. */
export function handleHomeNavClick(pathname: string, e: { preventDefault: () => void }) {
  if (pathname !== '/') return;
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  emitHomeFeedRefresh();
}

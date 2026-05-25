/**
 * Đảm bảo chỉ 1 video phát cùng lúc trên toàn app (kiểu Facebook).
 *
 * Singleton ở module scope vì:
 * - Không cần render UI → không cần React Context.
 * - Thao tác imperative trên DOM (`video.pause()`), không cần re-render.
 */

let current: HTMLVideoElement | null = null;
let controllerPausePending = false;

export const feedVideoController = {
  /**
   * Gọi từ `onPlay` handler của video. Pause video cũ (nếu có)
   * trước khi ghi nhận video mới làm "đương nhiệm".
   */
  setCurrent(video: HTMLVideoElement) {
    if (current && current !== video) {
      try {
        controllerPausePending = true;
        current.pause();
      } catch {
        controllerPausePending = false;
      }
    }
    current = video;
  },

  /** Pause do controller (video khác play) — hook dùng để không coi là user pause. */
  consumeControllerPause() {
    if (!controllerPausePending) return false;
    controllerPausePending = false;
    return true;
  },

  /**
   * Gọi từ cleanup khi component unmount. Chỉ reset nếu video bị unmount
   * đúng là cái đang được giữ — tránh vô tình xóa tham chiếu video khác.
   */
  clear(video: HTMLVideoElement) {
    if (current === video) current = null;
  },
};

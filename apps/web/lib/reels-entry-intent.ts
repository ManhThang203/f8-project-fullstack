/**
 * Cờ tạm báo "vào Reels từ thao tác bấm video ở feed" để Reels tự bật tiếng.
 *
 * Singleton module-scope vì chỉ là tín hiệu một lần giữa lần điều hướng,
 * không cần render UI hay React Context.
 */

let unmuteOnEntry = false;

/** Đánh dấu muốn bật tiếng khi vừa mở Reels (gọi trong cử chỉ bấm video ở feed). */
export function markUnmuteOnEntry() {
  unmuteOnEntry = true;
}

/** Đọc và xoá cờ; trả true nếu Reels nên ép bật tiếng cho lần mở này. */
export function consumeUnmuteOnEntry() {
  if (!unmuteOnEntry) return false;
  unmuteOnEntry = false;
  return true;
}

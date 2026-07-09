import type { KeyboardEvent } from 'react';

/** Xử lý Enter gửi bình luận; Shift+Enter xuống dòng; bỏ qua khi đang gõ IME. */
export function handleCommentEnterKey(
  event: KeyboardEvent<HTMLTextAreaElement>,
  onSubmit: () => void,
): void {
  if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
  event.preventDefault();
  onSubmit();
}

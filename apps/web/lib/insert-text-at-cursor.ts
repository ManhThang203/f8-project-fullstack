export type InsertTextResult = {
  nextValue: string;
  cursorPos: number;
};

/** Chèn chuỗi vào textarea tại vị trí con trỏ, tuân thủ maxLength nếu có. */
export function insertTextAtCursor(
  textarea: HTMLTextAreaElement | null,
  value: string,
  text: string,
  maxLength?: number,
): InsertTextResult | null {
  const start = textarea?.selectionStart ?? value.length;
  const end = textarea?.selectionEnd ?? value.length;
  const nextValue = value.slice(0, start) + text + value.slice(end);

  if (maxLength !== undefined && nextValue.length > maxLength) {
    return null;
  }

  return {
    nextValue,
    cursorPos: start + text.length,
  };
}

/** Khôi phục focus và vị trí con trỏ sau khi React cập nhật value. */
export function focusTextareaCursor(textarea: HTMLTextAreaElement | null, pos: number) {
  if (!textarea) return;
  textarea.focus();
  textarea.setSelectionRange(pos, pos);
}

/** Chèn emoji vào textarea và cập nhật state — dùng chung cho compose. */
export function applyEmojiInsert(
  textarea: HTMLTextAreaElement | null,
  content: string,
  emoji: string,
  setContent: (value: string) => void,
  maxLength = 2000,
) {
  const result = insertTextAtCursor(textarea, content, emoji, maxLength);
  if (!result) return;
  setContent(result.nextValue);
  requestAnimationFrame(() => focusTextareaCursor(textarea, result.cursorPos));
}

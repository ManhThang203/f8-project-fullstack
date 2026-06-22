const STORAGE_KEY = 'costy:recent-emojis';
const MAX_RECENT = 12;

/** Lấy danh sách emoji đã dùng gần đây từ localStorage. */
export function getRecentEmojis(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string').slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

/** Thêm emoji vào đầu danh sách gần đây, loại trùng, giới hạn 12. */
export function addRecentEmoji(emoji: string): string[] {
  const prev = getRecentEmojis().filter((item) => item !== emoji);
  const next = [emoji, ...prev].slice(0, MAX_RECENT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

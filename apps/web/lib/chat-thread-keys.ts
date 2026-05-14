/** Khóa thread: direct = `d:<userId>`, group = `g:<numericId>`. */

export function parseChatThreadKey(
  key: string,
): { type: 'direct'; id: string } | { type: 'group'; id: number } | null {
  if (typeof key !== 'string') return null;
  if (key.startsWith('d:')) {
    const id = key.slice(2);
    if (!id) return null;
    return { type: 'direct', id };
  }
  if (key.startsWith('g:')) {
    const n = Number(key.slice(2));
    if (!Number.isFinite(n) || n <= 0) return null;
    return { type: 'group', id: n };
  }
  return null;
}

export function chatThreadKey(type: 'direct' | 'group', id: string | number): string {
  return type === 'direct' ? `d:${id}` : `g:${id}`;
}

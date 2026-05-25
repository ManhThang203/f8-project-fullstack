import type { MsgRow } from './chat-dock.types';

export const CHAT_PAGE_SIZE = 40;

/** Gộp tin trùng id, sắp xếp theo thời gian tạo tăng dần. */
export function dedupeMessagesSorted(arr: MsgRow[]): MsgRow[] {
  const byKey = new Map<string, MsgRow>();
  for (const m of arr) {
    if (m?.id == null) continue;
    const k = String(m.id);
    const prev = byKey.get(k);
    if (!prev) {
      byKey.set(k, m);
      continue;
    }
    const tNew = new Date(m.createdAt).getTime();
    const tOld = new Date(prev.createdAt).getTime();
    if (Number.isFinite(tNew) && (!Number.isFinite(tOld) || tNew >= tOld)) {
      byKey.set(k, m);
    }
  }
  const out = [...byKey.values()];
  out.sort((x, y) => {
    const tx = new Date(x.createdAt).getTime();
    const ty = new Date(y.createdAt).getTime();
    return (Number.isFinite(tx) ? tx : 0) - (Number.isFinite(ty) ? ty : 0);
  });
  return out;
}

/** Hiển thị lỗi chat cho người dùng (tạm dùng alert). */
export function notifyChatError(message: string) {
  window.alert(message);
}

/** Tạo URL lấy lịch sử tin nhắn theo loại thread. */
export function buildMessagesUrl(
  threadType: 'direct' | 'group',
  id: string | number,
  opts?: { before?: number },
): string {
  const limit = CHAT_PAGE_SIZE;
  const before = opts?.before != null ? `&before=${opts.before}` : '';
  if (threadType === 'direct') {
    return `/chat/messages/${encodeURIComponent(String(id))}?limit=${limit}${before}`;
  }
  return `/chat/groups/${id}/messages?limit=${limit}${before}`;
}

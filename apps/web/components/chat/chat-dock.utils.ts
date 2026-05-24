import type { ChatPeerDto, Conversation } from '@/components/chat/chat-dock.types';
import { parseChatThreadKey } from '@/lib/chat-thread-keys';

/** Cùng tham chiếu khi thread chưa có tin — tránh `?? []` tạo array mới mỗi render. */
export const EMPTY_MESSAGE_LIST: [] = [];

/** Tạo label cho peer (username hoặc name) */
export function peerLabel(u: Pick<ChatPeerDto, 'name' | 'username'>) {
  return u.name?.trim() || `@${u.username}`;
}

/** Tạo metadata cho thread (title, subtitle, isGroup, avatarUrl) */
export function threadMeta(
  threadKey: string,
  conversations: Conversation[],
  getChatUser: (id: string) => ChatPeerDto | undefined,
) {
  const parsed = parseChatThreadKey(threadKey);
  // Nếu không phải thread group, trả về empty object
  if (!parsed) {
    return { title: '', subtitle: '', isGroup: false, avatarUrl: null as string | null };
  }
  if (parsed.type === 'group') {
    const c = conversations.find(
      (x): x is Extract<Conversation, { kind: 'group' }> =>
        x.kind === 'group' && x.groupId === parsed.id,
    );
    return {
      title: c?.name ?? `Nhóm #${parsed.id}`,
      subtitle: 'Nhóm',
      isGroup: true,
      avatarUrl: null as string | null,
    };
  }
  const c = conversations.find(
    (x): x is Extract<Conversation, { kind: 'direct' }> =>
      x.kind === 'direct' && x.peerUserId === parsed.id,
  );
  const p = c?.peer ?? getChatUser(parsed.id);
  return {
    title: p ? peerLabel(p) : `Chat ${parsed.id.slice(0, 8)}…`,
    subtitle: p ? `@${p.username}` : '',
    isGroup: false,
    avatarUrl: p?.image ?? null,
  };
}

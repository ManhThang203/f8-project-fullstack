import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import type { ChatMessageDto, Conversation, MessageReactionDto } from '@/types/chat';

/** Ghi đè danh sách hội thoại trong cache TanStack Query. */
function patchConversations(
  queryClient: QueryClient,
  updater: (list: Conversation[]) => Conversation[],
) {
  queryClient.setQueryData<Conversation[]>(queryKeys.chat.conversations, (prev) =>
    updater(prev ?? []),
  );
}

/** Sắp xếp hội thoại mới nhất lên đầu theo updatedAt. */
function sortByUpdatedAt(list: Conversation[]): Conversation[] {
  return [...list].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

/** Cập nhật lastMessage và unread sau tin mới — không refetch API. Trả false nếu room chưa có trong cache. */
export function patchConversationAfterMessage(
  queryClient: QueryClient,
  roomId: string,
  message: ChatMessageDto,
  opts: { viewingRoom: boolean; incrementUnread: boolean },
): boolean {
  let found = false;
  patchConversations(queryClient, (list) => {
    const idx = list.findIndex((c) => c.id === roomId);
    if (idx === -1) return list;
    found = true;

    const conv = list[idx]!;
    const updated: Conversation = {
      ...conv,
      lastMessage: message,
      updatedAt: message.createdAt,
      unreadCount: opts.viewingRoom
        ? 0
        : opts.incrementUnread
          ? conv.unreadCount + 1
          : conv.unreadCount,
    };

    const rest = list.filter((_, i) => i !== idx);
    return sortByUpdatedAt([updated, ...rest]);
  });
  return found;
}

/** Xóa tin khỏi cache phòng (đồng bộ tab khác sau chat:delete). Trả true nếu preview sidebar cần refetch. */
export function patchMessageDeleted(
  queryClient: QueryClient,
  roomId: string,
  messageId: string,
): boolean {
  queryClient.setQueryData<ChatMessageDto[]>(queryKeys.chat.roomMessages(roomId), (prev) => {
    if (!prev) return prev;
    return prev.filter((m) => m.id !== messageId);
  });

  const list = queryClient.getQueryData<Conversation[]>(queryKeys.chat.conversations);
  return Boolean(list?.some((c) => c.id === roomId && c.lastMessage?.id === messageId));
}

/** Đặt unreadCount = 0 khi user mở phòng chat. */
export function patchConversationMarkRead(queryClient: QueryClient, roomId: string) {
  patchConversations(queryClient, (list) =>
    list.map((c) => (c.id === roomId ? { ...c, unreadCount: 0 } : c)),
  );
}

/** Cập nhật receipt (đã nhận / đã xem) của peer trên sidebar. */
export function patchPeerReceipt(
  queryClient: QueryClient,
  roomId: string,
  peerUserId: string,
  receipt: { lastReadAt?: string; lastDeliveredAt?: string },
) {
  patchConversations(queryClient, (list) =>
    list.map((c) => {
      if (c.id !== roomId) return c;
      return {
        ...c,
        peers: c.peers.map((p) => (p.id === peerUserId ? { ...p, ...receipt } : p)),
      };
    }),
  );
}

/** Đánh dấu tin đã thu hồi trong cache phòng + preview sidebar nếu là tin cuối. */
export function patchMessageUnsent(
  queryClient: QueryClient,
  roomId: string,
  messageId: string,
) {
  queryClient.setQueryData<ChatMessageDto[]>(queryKeys.chat.roomMessages(roomId), (prev) => {
    if (!prev) return prev;
    return prev.map((m) => (m.id === messageId ? { ...m, isUnsent: true } : m));
  });

  patchConversations(queryClient, (list) =>
    list.map((c) => {
      if (c.id !== roomId || c.lastMessage?.id !== messageId) return c;
      return { ...c, lastMessage: { ...c.lastMessage, isUnsent: true } };
    }),
  );
}

/** Thêm/xóa reaction trên tin trong cache (không refetch). */
export function patchMessageReaction(
  queryClient: QueryClient,
  roomId: string,
  messageId: string,
  reaction: MessageReactionDto,
) {
  queryClient.setQueryData<ChatMessageDto[]>(queryKeys.chat.roomMessages(roomId), (prev) => {
    if (!prev) return prev;
    return prev.map((m) => {
      if (m.id !== messageId) return m;
      const exists = m.reactions.some(
        (r) => r.userId === reaction.userId && r.emoji === reaction.emoji,
      );
      if (exists) return m;
      return { ...m, reactions: [...m.reactions, reaction] };
    });
  });
}

/** Append tin mới vào cache phòng nếu chưa có. */
export function appendRoomMessage(
  queryClient: QueryClient,
  roomId: string,
  message: ChatMessageDto,
) {
  queryClient.setQueryData<ChatMessageDto[]>(queryKeys.chat.roomMessages(roomId), (prev) => {
    const list = prev ?? [];
    if (list.some((m) => m.id === message.id)) return list;
    return [...list, message];
  });
}

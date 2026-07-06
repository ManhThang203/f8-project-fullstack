'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';

import { useInvalidateChatConversations } from '@/hooks/queries/use-chat-queries';
import {
  appendRoomMessage,
  patchConversationAfterMessage,
  patchConversationMarkRead,
  patchMessageDeleted,
  patchMessageReaction,
  patchMessageUnsent,
  patchPeerReceipt,
} from '@/lib/chat-cache';
import { getChatSocket } from '@/lib/chat-socket';
import { queryKeys } from '@/lib/query-keys';
import type { ChatMessageDto, MessageReactionDto } from '@/types/chat';

/**
 * Kết nối socket `/chat`, đăng ký các event realtime (tin nhắn mới, reaction,
 * thu hồi, đã đọc, phòng mới) và đồng bộ cache TanStack Query theo roomId đang mở.
 */
export function useChatRoomSocket(meId: string | null, roomId: string | null) {
  const queryClient = useQueryClient();
  const invalidateConversations = useInvalidateChatConversations();
  const [chatSocket, setChatSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!meId) {
      setChatSocket(null);
      return;
    }
    let cancelled = false;
    void getChatSocket()
      .then((s) => {
        if (!cancelled) setChatSocket(s);
      })
      .catch(() => {
        if (!cancelled) setChatSocket(null);
      });
    return () => {
      cancelled = true;
    };
  }, [meId]);

  useEffect(() => {
    if (!chatSocket || !meId) return;

    const heartbeatInterval = setInterval(() => {
      chatSocket.emit('presence:heartbeat');
    }, 30_000);

    const nowIso = () => new Date().toISOString();

    const onMessage = (payload: ChatMessageDto) => {
      const viewingRoom = roomId === payload.roomId;
      const fromPeer = payload.senderId !== meId;

      // Append vào cache phòng nếu đang xem, hoặc phòng đó đã có cache
      // (tránh tạo cache thiếu cho phòng chưa từng mở).
      const hasRoomCache =
        queryClient.getQueryData(queryKeys.chat.roomMessages(payload.roomId)) !== undefined;
      if (viewingRoom || hasRoomCache) {
        appendRoomMessage(queryClient, payload.roomId, payload);
      }

      if (viewingRoom && fromPeer) {
        chatSocket.emit('chat:delivered', { roomId: payload.roomId });
        chatSocket.emit('chat:read', { roomId: payload.roomId });
      }

      const patched = patchConversationAfterMessage(queryClient, payload.roomId, payload, {
        viewingRoom,
        incrementUnread: fromPeer && !viewingRoom,
      });
      if (!patched) invalidateConversations();
    };

    const onDeleted = (payload: { messageId: string; roomId: string }) => {
      const needsSidebarRefresh = patchMessageDeleted(
        queryClient,
        payload.roomId,
        payload.messageId,
      );
      if (needsSidebarRefresh) invalidateConversations();
    };

    const onDelivered = (payload: { roomId: string; userId: string }) => {
      patchPeerReceipt(queryClient, payload.roomId, payload.userId, {
        lastDeliveredAt: nowIso(),
      });
    };

    const onRead = (payload: { roomId: string; userId: string }) => {
      const ts = nowIso();
      patchPeerReceipt(queryClient, payload.roomId, payload.userId, {
        lastReadAt: ts,
        lastDeliveredAt: ts,
      });
    };

    const onUnsent = (payload: { messageId: string; roomId: string }) => {
      patchMessageUnsent(queryClient, payload.roomId, payload.messageId);
    };

    const onReaction = (payload: { messageId: string; reaction: MessageReactionDto }) => {
      if (!roomId) return;
      patchMessageReaction(queryClient, roomId, payload.messageId, payload.reaction);
    };

    const onRoomCreated = (payload: { roomId?: string }) => {
      if (payload?.roomId) {
        chatSocket.emit('room:subscribe', { roomId: payload.roomId }, () => undefined);
      }
      invalidateConversations();
    };

    chatSocket.on('chat:message', onMessage);
    chatSocket.on('chat:reaction', onReaction);
    chatSocket.on('chat:unsent', onUnsent);
    chatSocket.on('chat:deleted', onDeleted);
    chatSocket.on('chat:delivered', onDelivered);
    chatSocket.on('chat:read', onRead);
    chatSocket.on('room:created', onRoomCreated);

    return () => {
      clearInterval(heartbeatInterval);
      chatSocket.off('chat:message', onMessage);
      chatSocket.off('chat:reaction', onReaction);
      chatSocket.off('chat:unsent', onUnsent);
      chatSocket.off('chat:deleted', onDeleted);
      chatSocket.off('chat:delivered', onDelivered);
      chatSocket.off('chat:read', onRead);
      chatSocket.off('room:created', onRoomCreated);
    };
  }, [chatSocket, meId, roomId, invalidateConversations, queryClient]);

  useEffect(() => {
    if (!chatSocket || !roomId) return;
    chatSocket.emit('chat:read', { roomId });
    patchConversationMarkRead(queryClient, roomId);
  }, [chatSocket, roomId, queryClient]);

  return chatSocket;
}

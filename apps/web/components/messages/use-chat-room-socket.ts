'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';

import { useInvalidateChatConversations } from '@/hooks/queries/use-chat-queries';
import { getChatSocket } from '@/lib/chat-socket';
import { queryKeys } from '@/lib/query-keys';
import type { ChatMessageDto } from '@/types/chat';

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

    // Tin nhắn mới: append vào cache phòng đang mở + báo delivered
    const onMessage = (payload: ChatMessageDto) => {
      if (roomId === payload.roomId) {
        queryClient.setQueryData<ChatMessageDto[]>(
          queryKeys.chat.roomMessages(payload.roomId),
          (prev) => {
            if (!prev) return prev;
            if (prev.some((m) => m.id === payload.id)) return prev;
            return [...prev, payload];
          },
        );
        chatSocket.emit('chat:delivered', { roomId: payload.roomId });
      }
      invalidateConversations();
    };

    const invalidateRoom = (payload: { roomId: string }) => {
      if (roomId === payload.roomId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.roomMessages(payload.roomId) });
      }
      invalidateConversations();
    };

    // Được thêm vào phòng mới (vd: nhóm vừa tạo) → subscribe + refresh sidebar
    const onRoomCreated = (payload: { roomId?: string }) => {
      if (payload?.roomId) {
        chatSocket.emit('room:subscribe', { roomId: payload.roomId }, () => undefined);
      }
      invalidateConversations();
    };

    const onReaction = () => {
      if (roomId) queryClient.invalidateQueries({ queryKey: queryKeys.chat.roomMessages(roomId) });
    };

    chatSocket.on('chat:message', onMessage);
    chatSocket.on('chat:reaction', onReaction);
    chatSocket.on('chat:unsent', invalidateRoom);
    chatSocket.on('chat:deleted', invalidateRoom);
    chatSocket.on('chat:delivered', invalidateRoom);
    chatSocket.on('chat:read', invalidateRoom);
    chatSocket.on('room:created', onRoomCreated);

    return () => {
      chatSocket.off('chat:message', onMessage);
      chatSocket.off('chat:reaction', onReaction);
      chatSocket.off('chat:unsent', invalidateRoom);
      chatSocket.off('chat:deleted', invalidateRoom);
      chatSocket.off('chat:delivered', invalidateRoom);
      chatSocket.off('chat:read', invalidateRoom);
      chatSocket.off('room:created', onRoomCreated);
    };
  }, [chatSocket, meId, roomId, invalidateConversations, queryClient]);

  // Đánh dấu đã đọc khi mở phòng
  useEffect(() => {
    if (chatSocket && roomId) {
      chatSocket.emit('chat:read', { roomId });
      invalidateConversations();
    }
  }, [chatSocket, roomId, invalidateConversations]);

  return chatSocket;
}

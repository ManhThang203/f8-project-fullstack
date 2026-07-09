'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import { apiQueryData } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { getChatSocket } from '@/lib/socket';
import type { ChatMessageDto, Conversation } from '@/types/chat';

export const EMPTY_ROOM_MESSAGES: ChatMessageDto[] = [];
export const EMPTY_CONVERSATIONS: Conversation[] = [];

export function useChatConversations(enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.conversations,
    queryFn: () => apiQueryData<Conversation[]>('/chat/conversations'),
    enabled,
  });
}

/** Tổng số tin nhắn chưa đọc trên tất cả hội thoại (dùng cho badge icon Tin nhắn). */
export function useChatUnreadTotal(enabled = true) {
  const { data } = useChatConversations(enabled);
  return (data ?? EMPTY_CONVERSATIONS).reduce((sum, c) => sum + c.unreadCount, 0);
}

/**
 * Lắng nghe socket `/chat` toàn cục để invalidate danh sách hội thoại khi có
 * tin mới / đã đọc / thu hồi / phòng mới — giúp badge unread cập nhật realtime
 * kể cả khi user không ở trang /messages.
 */
export function useChatUnreadSync(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    void getChatSocket()
      .then((socket) => {
        if (cancelled) return;
        const invalidate = () =>
          void queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations });

        socket.on('chat:message', invalidate);
        socket.on('chat:read', invalidate);
        socket.on('chat:unsent', invalidate);
        socket.on('room:created', invalidate);

        cleanup = () => {
          socket.off('chat:message', invalidate);
          socket.off('chat:read', invalidate);
          socket.off('chat:unsent', invalidate);
          socket.off('room:created', invalidate);
        };
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [enabled, queryClient]);
}

export function useInvalidateChatConversations() {
  const queryClient = useQueryClient();
  return useCallback(
    () => void queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations }),
    [queryClient],
  );
}

export function useRoomMessages(roomId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.roomMessages(roomId ?? ''),
    queryFn: async () => {
      if (!roomId) return [];
      return apiQueryData<ChatMessageDto[]>(
        `/chat/rooms/${encodeURIComponent(roomId)}/messages`,
      );
    },
    enabled: enabled && Boolean(roomId),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useCreateChatRoomMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { isGroup?: boolean; name?: string; memberUserIds: string[] }) =>
      apiQueryData<{
        id: string;
        members: { userId: string }[];
      }>('/chat/rooms', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations });
    },
  });
}

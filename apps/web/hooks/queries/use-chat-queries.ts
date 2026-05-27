'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ChatMessageDto, Conversation } from '@/types/chat';
import { apiQuery, apiQueryData } from '@/lib/api-query';
import { queryKeys } from '@/lib/query-keys';

export const EMPTY_ROOM_MESSAGES: ChatMessageDto[] = [];
export const EMPTY_CONVERSATIONS: Conversation[] = [];

export function useChatConversations(enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.conversations,
    queryFn: () => apiQueryData<Conversation[]>('/chat/conversations'),
    enabled,
  });
}

export function useInvalidateChatConversations() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations });
}

export function useRoomMessages(roomId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.roomMessages(roomId ?? ''),
    queryFn: async () => {
      if (!roomId) return [];
      const data = await apiQueryData<ChatMessageDto[]>(
        `/chat/rooms/${encodeURIComponent(roomId)}/messages`,
      );
      void apiQuery(`/chat/rooms/${encodeURIComponent(roomId)}/read`, {
        method: 'POST',
      }).catch(() => undefined);
      return data;
    },
    enabled: enabled && Boolean(roomId),
  });
}

export function useCreateChatRoomMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { isGroup?: boolean; name?: string; memberUserIds: string[]; encryptedRoomKeys: Record<string, string> }) =>
      apiQueryData<{ id: string }>('/chat/rooms', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations });
    },
  });
}

'use client';

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiQueryData } from '@/lib/api-query';
import { queryKeys } from '@/lib/query-keys';
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

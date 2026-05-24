'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ChatPeerDto, Conversation } from '@/components/chat/chat-dock.types';
import { apiQuery, apiQueryData } from '@/lib/api-query';
import { queryKeys } from '@/lib/query-keys';

export type DirectMsg = {
  id: number;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
};

export type GroupMsg = {
  id: number;
  groupId: number;
  senderId: string;
  body: string;
  createdAt: string;
};

export const EMPTY_DIRECT_MESSAGES: DirectMsg[] = [];
export const EMPTY_GROUP_MESSAGES: GroupMsg[] = [];

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

export function useDirectMessages(peerUserId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.directMessages(peerUserId ?? ''),
    queryFn: async () => {
      const data = await apiQueryData<DirectMsg[]>(
        `/chat/messages/${encodeURIComponent(peerUserId!)}`,
      );
      void apiQuery('/chat/direct/read', {
        method: 'POST',
        body: JSON.stringify({ peerUserId }),
      }).catch(() => undefined);
      return data;
    },
    enabled: enabled && Boolean(peerUserId),
  });
}

export function useGroupMessages(groupId: number | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.groupMessages(groupId ?? 0),
    queryFn: async () => {
      const data = await apiQueryData<GroupMsg[]>(`/chat/groups/${groupId!}/messages`);
      void apiQuery(`/chat/groups/${groupId!}/read`, {
        method: 'POST',
        body: JSON.stringify({}),
      }).catch(() => undefined);
      return data;
    },
    enabled: enabled && groupId != null && groupId > 0,
  });
}

export function useCreateChatGroupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; memberUserIds: string[] }) =>
      apiQueryData<{ id: number }>('/chat/groups', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations });
    },
  });
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { EMPTY_CONVERSATIONS } from '@/hooks/queries/use-chat-queries';
import { authClient } from '@/lib/auth-client';
import { apiQueryData } from '@/lib/api-query';
import { queryKeys } from '@/lib/query-keys';

import { dockReducer, initialDock } from './chat-dock.reducer';
import { notifyChatError } from './chat-dock-messages.utils';
import type { ChatDockContextValue, Conversation } from './chat-dock.types';
import { useChatDockMessages } from './use-chat-dock-messages';
import { useChatDockSocket } from './use-chat-dock-socket';
import { useChatDockThreadActions } from './use-chat-dock-thread-actions';
import { useChatDockTyping } from './use-chat-dock-typing';
import { useChatDockUserDirectory } from './use-chat-dock-user-directory';

/** Gom toàn bộ state và action của chat dock — dùng bởi ChatDockProvider. */
export function useChatDockController(): ChatDockContextValue {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id ?? null;

  const [dock, dispatch] = useReducer(dockReducer, initialDock);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);

  const {
    data: conversationsData,
    refetch: refetchConversationsQuery,
  } = useQuery({
    queryKey: queryKeys.chat.conversations,
    queryFn: () => apiQueryData<Conversation[]>('/chat/conversations'),
    enabled: Boolean(userId),
  });
  const conversations = conversationsData ?? EMPTY_CONVERSATIONS;

  const messages = useChatDockMessages();
  const typing = useChatDockTyping(userId);
  const userDirectory = useChatDockUserDirectory();

  const refetchConversations = useCallback(async () => {
    if (!userId) return;
    await refetchConversationsQuery();
  }, [userId, refetchConversationsQuery]);

  const refetchConversationsRef = useRef(refetchConversations);
  refetchConversationsRef.current = refetchConversations;

  const bumpTypingUserRef = useRef(typing.bumpTypingUser);
  bumpTypingUserRef.current = typing.bumpTypingUser;

  useChatDockSocket(userId, {
    setMessagesByThread: messages.setMessagesByThread,
    socketEventSeenRef: messages.socketEventSeenRef,
    refetchConversationsRef,
    bumpTypingUserRef,
    resetMessages: messages.resetMessages,
  });

  const threadActions = useChatDockThreadActions({
    userId,
    dock,
    dispatch,
    loadHistory: messages.loadHistory,
    refetchConversations,
  });

  const unreadChatTotal = useMemo(
    () => conversations.reduce((s, c) => s + (Number(c.unreadCount) || 0), 0),
    [conversations],
  );

  const {
    messagesByThread,
    threadPaging,
    loadingOlderThread,
    loadHistory,
    loadOlderMessages,
    sendText,
    resetMessages,
  } = messages;

  const {
    typingUsersByThread,
    emitTypingDebounced,
    resetTyping,
  } = typing;

  const {
    openThread,
    openDirectChat,
    openGroupChat,
    closeChat,
    minimizeChat,
    promoteFromQueue,
    subscribeGroupSocket,
  } = threadActions;

  const { registerChatUsers, getChatUser, userDirectoryVersion } = userDirectory;

  useEffect(() => {
    if (!userId) {
      dispatch({ type: 'RESET' });
      setPickerOpen(false);
      setGroupModalOpen(false);
      setHubOpen(false);
      resetMessages();
      resetTyping();
      return;
    }
    void refetchConversations();
  }, [userId, refetchConversations, resetMessages, resetTyping]);

  useEffect(() => {
    if (hubOpen && userId) void refetchConversations();
  }, [hubOpen, userId, refetchConversations]);

  const createGroup = useCallback(
    async ({ name, memberUserIds }: { name: string; memberUserIds: string[] }) => {
      try {
        const data = await apiQueryData<{ id: number }>('/chat/groups', {
          method: 'POST',
          body: JSON.stringify({ name, memberUserIds }),
        });
        subscribeGroupSocket(data.id);
        await refetchConversations();
        openGroupChat(data.id);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Tạo nhóm thất bại';
        notifyChatError(message);
        throw err;
      }
    },
    [subscribeGroupSocket, openGroupChat, refetchConversations],
  );

  return useMemo(
    () => ({
      dock,
      messagesByThread,
      pickerOpen,
      setPickerOpen,
      groupModalOpen,
      setGroupModalOpen,
      hubOpen,
      setHubOpen,
      toggleHub: () => setHubOpen((v) => !v),
      conversations,
      refetchConversations,
      unreadChatTotal,
      threadPaging,
      loadingOlderThread,
      loadOlderMessages,
      typingUsersByThread,
      emitTypingDebounced,
      openThread,
      openDirectChat,
      openGroupChat,
      closeChat,
      minimizeChat,
      promoteFromQueue,
      sendText,
      loadHistory,
      createGroup,
      subscribeGroupSocket,
      registerChatUsers,
      getChatUser,
      userDirectoryVersion,
    }),
    [
      dock,
      messagesByThread,
      pickerOpen,
      groupModalOpen,
      hubOpen,
      conversations,
      refetchConversations,
      unreadChatTotal,
      threadPaging,
      loadingOlderThread,
      loadOlderMessages,
      typingUsersByThread,
      emitTypingDebounced,
      openThread,
      openDirectChat,
      openGroupChat,
      closeChat,
      minimizeChat,
      promoteFromQueue,
      sendText,
      loadHistory,
      createGroup,
      subscribeGroupSocket,
      registerChatUsers,
      getChatUser,
      userDirectoryVersion,
    ],
  );
}

'use client';

import { useEffect, useRef } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import { getChatSocket, resetChatSocket } from '@/lib/chat-socket';
import { chatThreadKey } from '@/lib/chat-thread-keys';
import { sameChatUserId } from '@/lib/chat-user-ids';

import { dedupeMessagesSorted } from './chat-dock-messages.utils';
import type { MsgRow } from './chat-dock.types';

type SocketMessagesApi = {
  setMessagesByThread: Dispatch<SetStateAction<Record<string, MsgRow[]>>>;
  socketEventSeenRef: MutableRefObject<Set<string>>;
  refetchConversationsRef: MutableRefObject<() => Promise<void>>;
  bumpTypingUserRef: MutableRefObject<(threadKey: string, uid: string) => void>;
  resetMessages: () => void;
};

/** Lắng nghe socket chat: tin nhắn mới, typing; reset khi logout. */
export function useChatDockSocket(
  userId: string | null,
  {
    setMessagesByThread,
    socketEventSeenRef,
    refetchConversationsRef,
    bumpTypingUserRef,
    resetMessages,
  }: SocketMessagesApi,
) {
  const userRef = useRef(userId);
  userRef.current = userId;

  useEffect(() => {
    if (!userId) {
      resetChatSocket();
      resetMessages();
      socketEventSeenRef.current = new Set();
      return;
    }

    let cancelled = false;
    let detachListeners: (() => void) | undefined;

    void (async () => {
      try {
        const s = await getChatSocket();
        if (cancelled) return;

        const onChatMessage = (msg: {
          kind?: string;
          id?: number;
          senderId?: string;
          recipientId?: string;
          body?: string;
          createdAt?: string;
        }) => {
          if (msg?.kind === 'group') return;
          const uid = userRef.current;
          if (msg.id == null || !uid || !msg.senderId) return;
          if (sameChatUserId(msg.senderId, uid)) return;

          const key = chatThreadKey('direct', msg.senderId);
          const evKey = `d:${key}:${msg.id}`;
          if (socketEventSeenRef.current.has(evKey)) return;
          socketEventSeenRef.current.add(evKey);
          if (socketEventSeenRef.current.size > 2000) socketEventSeenRef.current = new Set();

          setMessagesByThread((prev) => {
            const arr = [...(prev[key] ?? [])];
            arr.push({
              id: msg.id!,
              senderId: msg.senderId!,
              recipientId: msg.recipientId ?? uid,
              body: msg.body ?? '',
              createdAt: msg.createdAt ?? new Date().toISOString(),
            });
            return { ...prev, [key]: dedupeMessagesSorted(arr) };
          });
          void refetchConversationsRef.current();
        };

        const onGroupMessage = (msg: {
          kind?: string;
          id?: number;
          groupId?: number;
          senderId?: string;
          body?: string;
          createdAt?: string;
        }) => {
          if (msg?.kind !== 'group' || msg.groupId == null || msg.id == null) return;
          const uid = userRef.current;
          if (!uid || !msg.senderId) return;
          if (sameChatUserId(msg.senderId, uid)) return;

          const key = chatThreadKey('group', msg.groupId);
          const evKey = `g:${key}:${msg.id}`;
          if (socketEventSeenRef.current.has(evKey)) return;
          socketEventSeenRef.current.add(evKey);
          if (socketEventSeenRef.current.size > 2000) socketEventSeenRef.current = new Set();

          setMessagesByThread((prev) => {
            const arr = [...(prev[key] ?? [])];
            arr.push({
              id: msg.id!,
              groupId: msg.groupId!,
              senderId: msg.senderId!,
              body: msg.body ?? '',
              createdAt: msg.createdAt ?? new Date().toISOString(),
            });
            return { ...prev, [key]: dedupeMessagesSorted(arr) };
          });
          void refetchConversationsRef.current();
        };

        const onChatTyping = (payload: { fromUserId?: string }) => {
          const from = payload?.fromUserId;
          const uid = userRef.current;
          if (!from || sameChatUserId(from, uid)) return;
          const key = chatThreadKey('direct', from);
          bumpTypingUserRef.current(key, from);
        };

        const onGroupTyping = (payload: { groupId?: number; fromUserId?: string }) => {
          const gid = Number(payload?.groupId);
          const from = payload?.fromUserId;
          const uid = userRef.current;
          if (!Number.isFinite(gid) || !from || sameChatUserId(from, uid)) return;
          const key = chatThreadKey('group', gid);
          bumpTypingUserRef.current(key, from);
        };

        s.on('chat:message', onChatMessage);
        s.on('chat:group:message', onGroupMessage);
        s.on('chat:typing', onChatTyping);
        s.on('group:typing', onGroupTyping);

        detachListeners = () => {
          s.off('chat:message', onChatMessage);
          s.off('chat:group:message', onGroupMessage);
          s.off('chat:typing', onChatTyping);
          s.off('group:typing', onGroupTyping);
        };
      } catch {
        /* socket optional */
      }
    })();

    return () => {
      cancelled = true;
      detachListeners?.();
    };
  }, [
    userId,
    setMessagesByThread,
    socketEventSeenRef,
    refetchConversationsRef,
    bumpTypingUserRef,
    resetMessages,
  ]);
}

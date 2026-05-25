'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';
import type { Dispatch } from 'react';

import { apiQuery } from '@/lib/api-query';
import { getChatSocketInstance } from '@/lib/chat-socket';
import { chatThreadKey, parseChatThreadKey } from '@/lib/chat-thread-keys';

import { initialDock } from './chat-dock.reducer';
import type { DockAction, DockState } from './chat-dock.types';

type ThreadActionsDeps = {
  userId: string | null;
  dock: DockState;
  dispatch: Dispatch<DockAction>;
  loadHistory: (threadKey: string) => Promise<void>;
  refetchConversations: () => Promise<void>;
};

/** Mở/đóng/minimize thread, đánh dấu đã đọc, subscribe group khi slot mới mở. */
export function useChatDockThreadActions({
  userId,
  dock,
  dispatch,
  loadHistory,
  refetchConversations,
}: ThreadActionsDeps) {
  const prevSlotsRef = useRef(initialDock.slots);

  const markThreadRead = useCallback(
    async (threadKey: string) => {
      const parsed = parseChatThreadKey(threadKey);
      if (!parsed) return;
      try {
        if (parsed.type === 'direct') {
          await apiQuery('/chat/direct/read', {
            method: 'POST',
            body: JSON.stringify({ peerUserId: parsed.id }),
          }).catch(() => undefined);
        } else {
          await apiQuery(`/chat/groups/${parsed.id}/read`, {
            method: 'POST',
            body: JSON.stringify({}),
          }).catch(() => undefined);
        }
        void refetchConversations();
      } catch {
        /* ignore */
      }
    },
    [refetchConversations],
  );

  useLayoutEffect(() => {
    if (!userId) return;
    const [pa, pb] = prevSlotsRef.current;
    const [na, nb] = dock.slots;
    prevSlotsRef.current = dock.slots;
    const prevKeys = new Set([pa, pb].filter(Boolean));
    for (const nk of [na, nb].filter(Boolean)) {
      if (nk && !prevKeys.has(nk)) {
        void loadHistory(nk);
        void markThreadRead(nk);
        const parsed = parseChatThreadKey(nk);
        if (parsed?.type === 'group') {
          getChatSocketInstance()?.emit('group:subscribe', { groupId: parsed.id }, () => undefined);
        }
      }
    }
  }, [userId, dock.slots, loadHistory, markThreadRead]);

  const openThread = useCallback(
    (threadKey: string) => {
      if (!userId || threadKey == null) return;
      const parsed = parseChatThreadKey(threadKey);
      if (parsed?.type === 'direct' && parsed.id === userId) return;
      dispatch({ type: 'OPEN', threadKey });
    },
    [userId, dispatch],
  );

  const openDirectChat = useCallback(
    (peerId: string) => {
      if (!userId || peerId === userId) return;
      openThread(chatThreadKey('direct', peerId));
    },
    [userId, openThread],
  );

  const openGroupChat = useCallback(
    (groupId: number) => {
      openThread(chatThreadKey('group', groupId));
    },
    [openThread],
  );

  const closeChat = useCallback(
    (threadKey: string) => {
      dispatch({ type: 'CLOSE', threadKey });
    },
    [dispatch],
  );

  const minimizeChat = useCallback(
    (threadKey: string) => {
      dispatch({ type: 'MINIMIZE', threadKey });
    },
    [dispatch],
  );

  const promoteFromQueue = useCallback(
    (threadKey: string) => {
      dispatch({ type: 'PROMOTE', threadKey });
    },
    [dispatch],
  );

  const subscribeGroupSocket = useCallback((groupId: number) => {
    getChatSocketInstance()?.emit('group:subscribe', { groupId }, () => undefined);
  }, []);

  return {
    openThread,
    openDirectChat,
    openGroupChat,
    closeChat,
    minimizeChat,
    promoteFromQueue,
    subscribeGroupSocket,
  };
}

'use client';

import { useCallback, useRef, useState } from 'react';

import { getChatSocketInstance } from '@/lib/chat-socket';
import { parseChatThreadKey } from '@/lib/chat-thread-keys';
import { sameChatUserId } from '@/lib/chat-user-ids';

/** Quản lý trạng thái "đang gõ" theo thread và emit sự kiện typing qua socket. */
export function useChatDockTyping(userId: string | null) {
  const [typingUsersByThread, setTypingUsersByThread] = useState<Record<string, Set<string>>>({});
  const typingClearTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const typingDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const resetTyping = useCallback(() => {
    setTypingUsersByThread({});
    for (const tid of Object.keys(typingClearTimersRef.current)) {
      clearTimeout(typingClearTimersRef.current[tid]);
    }
    typingClearTimersRef.current = {};
    for (const key of Object.keys(typingDebounceRef.current)) {
      clearTimeout(typingDebounceRef.current[key]);
    }
    typingDebounceRef.current = {};
  }, []);

  const bumpTypingUser = useCallback(
    (threadKey: string, uid: string) => {
      if (!uid || sameChatUserId(uid, userId)) return;
      setTypingUsersByThread((prev) => {
        const next = { ...prev };
        const set = new Set(next[threadKey] ?? []);
        set.add(uid);
        next[threadKey] = set;
        return next;
      });
      const map = typingClearTimersRef.current;
      const tid = `${threadKey}:${uid}`;
      if (map[tid]) clearTimeout(map[tid]);
      map[tid] = setTimeout(() => {
        setTypingUsersByThread((prev) => {
          const next = { ...prev };
          const set = new Set(next[threadKey] ?? []);
          set.delete(uid);
          if (set.size === 0) delete next[threadKey];
          else next[threadKey] = set;
          return next;
        });
        delete map[tid];
      }, 3500);
    },
    [userId],
  );

  const emitTypingDebounced = useCallback((threadKey: string) => {
    const s = getChatSocketInstance();
    if (!s?.connected) return;
    const parsed = parseChatThreadKey(threadKey);
    if (!parsed) return;
    if (typingDebounceRef.current[threadKey]) {
      clearTimeout(typingDebounceRef.current[threadKey]);
    }
    typingDebounceRef.current[threadKey] = setTimeout(() => {
      delete typingDebounceRef.current[threadKey];
      if (parsed.type === 'direct') {
        s.emit('chat:typing', { peerUserId: parsed.id });
      } else {
        s.emit('group:typing', { groupId: parsed.id });
      }
    }, 450);
  }, []);

  return {
    typingUsersByThread,
    bumpTypingUser,
    emitTypingDebounced,
    resetTyping,
  };
}

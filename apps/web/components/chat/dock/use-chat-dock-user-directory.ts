'use client';

import { useCallback, useRef, useState } from 'react';

import type { ChatPeerDto } from './chat-dock.types';

/** Cache thông tin user (avatar, tên) cho UI chat dock. */
export function useChatDockUserDirectory() {
  const userByIdRef = useRef<Map<string, ChatPeerDto>>(new Map());
  const [userMapTick, setUserMapTick] = useState(0);

  const getChatUser = useCallback((id: string) => userByIdRef.current.get(id), []);

  /** Cập nhật map user — gọi khi picker/modal load danh sách user. */
  const registerChatUsers = useCallback((users: ChatPeerDto[]) => {
    const m = new Map(userByIdRef.current);
    let changed = false;
    for (const u of users) {
      const prev = m.get(u.id);
      if (
        !prev ||
        prev.username !== u.username ||
        prev.name !== u.name ||
        prev.image !== u.image
      ) {
        m.set(u.id, u);
        changed = true;
      }
    }
    if (!changed) return;
    userByIdRef.current = m;
    setUserMapTick((t) => t + 1);
  }, []);

  return {
    getChatUser,
    registerChatUsers,
    userDirectoryVersion: userMapTick,
  };
}

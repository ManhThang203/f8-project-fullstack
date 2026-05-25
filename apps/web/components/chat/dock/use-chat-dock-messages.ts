'use client';

import { useCallback, useRef, useState } from 'react';

import { apiQueryData } from '@/lib/api-query';
import { getChatSocket, getChatSocketInstance } from '@/lib/chat-socket';
import { parseChatThreadKey } from '@/lib/chat-thread-keys';

import {
  buildMessagesUrl,
  CHAT_PAGE_SIZE,
  dedupeMessagesSorted,
  notifyChatError,
} from './chat-dock-messages.utils';
import type { MsgRow } from './chat-dock.types';

/** Quản lý cache tin nhắn theo thread: tải lịch sử, phân trang, gửi qua socket. */
export function useChatDockMessages() {
  const [messagesByThread, setMessagesByThread] = useState<Record<string, MsgRow[]>>({});
  const [threadPaging, setThreadPaging] = useState<Record<string, { hasMoreOlder: boolean }>>({});
  const [loadingOlderThread, setLoadingOlderThread] = useState<Record<string, boolean>>({});

  const sendDedupeRef = useRef({ key: '', at: 0 });
  const ackSeenRef = useRef(new Set<string>());
  const socketEventSeenRef = useRef(new Set<string>());

  const resetMessages = useCallback(() => {
    setMessagesByThread({});
    setThreadPaging({});
    setLoadingOlderThread({});
    ackSeenRef.current = new Set();
  }, []);

  const appendOutgoingMessage = useCallback((threadKey: string, m: MsgRow) => {
    setMessagesByThread((prev) => ({
      ...prev,
      [threadKey]: dedupeMessagesSorted([...(prev[threadKey] ?? []), m]),
    }));
  }, []);

  const loadHistory = useCallback(async (threadKey: string) => {
    const parsed = parseChatThreadKey(threadKey);
    if (!parsed) return;
    try {
      const url = buildMessagesUrl(parsed.type, parsed.id);
      const res = await apiQueryData<MsgRow[]>(url);
      const list = dedupeMessagesSorted(res);
      setMessagesByThread((prev) => ({ ...prev, [threadKey]: list }));
      setThreadPaging((p) => ({
        ...p,
        [threadKey]: { hasMoreOlder: list.length >= CHAT_PAGE_SIZE },
      }));
    } catch {
      notifyChatError('Không tải được lịch sử chat');
    }
  }, []);

  const loadOlderMessages = useCallback(
    async (threadKey: string) => {
      const parsed = parseChatThreadKey(threadKey);
      if (!parsed) return;
      const list = messagesByThread[threadKey] ?? [];
      const oldest = list[0];
      const paging = threadPaging[threadKey];
      if (!oldest?.id || loadingOlderThread[threadKey] || !paging?.hasMoreOlder) return;

      setLoadingOlderThread((x) => ({ ...x, [threadKey]: true }));
      try {
        const url = buildMessagesUrl(parsed.type, parsed.id, { before: oldest.id });
        const older = await apiQueryData<MsgRow[]>(url).catch(() => [] as MsgRow[]);
        setMessagesByThread((prev) => {
          const cur = [...(prev[threadKey] ?? [])];
          const seen = new Set(cur.map((m) => String(m.id)));
          for (const m of older) {
            if (!seen.has(String(m.id))) {
              seen.add(String(m.id));
              cur.unshift(m);
            }
          }
          return { ...prev, [threadKey]: dedupeMessagesSorted(cur) };
        });
        setThreadPaging((p) => ({
          ...p,
          [threadKey]: { hasMoreOlder: older.length >= CHAT_PAGE_SIZE },
        }));
      } catch {
        notifyChatError('Không tải thêm tin nhắn');
      } finally {
        setLoadingOlderThread((x) => ({ ...x, [threadKey]: false }));
      }
    },
    [messagesByThread, threadPaging, loadingOlderThread],
  );

  const sendText = useCallback(
    async (threadKey: string, text: string) => {
      let s = getChatSocketInstance();
      if (!s?.connected) {
        try {
          s = await getChatSocket();
        } catch {
          notifyChatError('Chưa kết nối chat — thử tải lại trang.');
          return;
        }
      }
      const parsed = parseChatThreadKey(threadKey);
      if (!parsed) return;
      const trimmed = String(text ?? '').trim();
      if (!trimmed) return;

      const now = Date.now();
      const dedupeKey = `${threadKey}::${trimmed}`;
      const { key: prevKey, at: prevAt } = sendDedupeRef.current;
      if (prevKey === dedupeKey && now - prevAt < 900) return;
      sendDedupeRef.current = { key: dedupeKey, at: now };

      const applyAck = (m: MsgRow) => {
        if (m?.id == null) return;
        const idStr = String(m.id);
        const ackKey = `${threadKey}:${idStr}`;
        if (ackSeenRef.current.has(ackKey)) return;
        ackSeenRef.current.add(ackKey);
        if (ackSeenRef.current.size > 600) ackSeenRef.current = new Set();
        appendOutgoingMessage(threadKey, m);
      };

      if (parsed.type === 'direct') {
        s.emit(
          'chat:send',
          { peerUserId: parsed.id, text: trimmed },
          (ack: { ok?: boolean; error?: string; message?: MsgRow }) => {
            if (ack && ack.ok === false) {
              notifyChatError(ack.error || 'Gửi tin nhắn thất bại');
              return;
            }
            const m = ack?.message;
            if (m && 'recipientId' in m) {
              applyAck({
                id: m.id,
                senderId: m.senderId,
                recipientId: m.recipientId,
                body: m.body,
                createdAt: m.createdAt,
              });
            }
          },
        );
        return;
      }

      const groupId = parsed.id;
      s.emit(
        'group:send',
        { groupId, text: trimmed },
        (ack: { ok?: boolean; error?: string; message?: MsgRow }) => {
          if (ack && ack.ok === false) {
            notifyChatError(ack.error || 'Gửi tin nhắn thất bại');
            return;
          }
          const m = ack?.message;
          if (m && 'groupId' in m) {
            applyAck({
              id: m.id,
              groupId: m.groupId,
              senderId: m.senderId,
              body: m.body,
              createdAt: m.createdAt,
            });
          }
        },
      );
    },
    [appendOutgoingMessage],
  );

  return {
    messagesByThread,
    setMessagesByThread,
    threadPaging,
    loadingOlderThread,
    loadHistory,
    loadOlderMessages,
    sendText,
    resetMessages,
    ackSeenRef,
    socketEventSeenRef,
  };
}

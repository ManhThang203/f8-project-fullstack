'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

import { apiFetch } from '@/lib/api-client';
import { authClient } from '@/lib/auth-client';
import { getChatSocket, getChatSocketInstance, resetChatSocket } from '@/lib/chat-socket';
import { chatThreadKey, parseChatThreadKey } from '@/lib/chat-thread-keys';
import { sameChatUserId } from '@/lib/chat-user-ids';

const CHAT_PAGE_SIZE = 40;

type DockState = { slots: [string | null, string | null]; queue: string[] };

const initialDock: DockState = { slots: [null, null], queue: [] };

function dockReducer(
  state: DockState,
  action: { type: string; threadKey?: string | null },
): DockState {
  const { slots, queue } = state;
  const [a, b] = slots;
  const k = action.threadKey;

  switch (action.type) {
    case 'OPEN': {
      if (k == null) return state;
      if (k === a || k === b) return state;
      if (a == null) {
        return { ...state, slots: [k, b], queue: queue.filter((id) => id !== k) };
      }
      if (b == null) {
        return { ...state, slots: [a, k], queue: queue.filter((id) => id !== k) };
      }
      const bumped = a;
      const nextQueue = [bumped, ...queue.filter((id) => id !== k && id !== bumped)];
      return { slots: [b, k], queue: nextQueue };
    }
    case 'CLOSE': {
      if (k == null) return state;
      let nextQueue = queue.filter((id) => id !== k);
      if (k !== a && k !== b) {
        return { ...state, queue: nextQueue };
      }
      let na = k === a ? null : a;
      let nb = k === b ? null : b;
      if (nextQueue.length > 0) {
        const promote = nextQueue[0]!;
        nextQueue = nextQueue.slice(1);
        if (k === a) na = promote;
        else nb = promote;
      }
      return { slots: [na, nb], queue: nextQueue };
    }
    case 'MINIMIZE': {
      if (k == null) return state;
      if (k === a) {
        return {
          ...state,
          slots: [null, b],
          queue: [k, ...queue.filter((id) => id !== k)],
        };
      }
      if (k === b) {
        return {
          ...state,
          slots: [a, null],
          queue: [k, ...queue.filter((id) => id !== k)],
        };
      }
      return state;
    }
    case 'PROMOTE': {
      if (k == null || !queue.includes(k)) return state;
      const rest = queue.filter((id) => id !== k);
      if (b == null && a != null) {
        return { ...state, slots: [a, k], queue: rest };
      }
      if (a == null) {
        return { ...state, slots: [k, b], queue: rest };
      }
      const bumped = a;
      return { slots: [k, b], queue: [bumped, ...rest] };
    }
    case 'RESET':
      return initialDock;
    default:
      return state;
  }
}

type MsgRow =
  | {
      id: number;
      senderId: string;
      recipientId: string;
      body: string;
      createdAt: string;
    }
  | {
      id: number;
      groupId: number;
      senderId: string;
      body: string;
      createdAt: string;
    };

export type ChatPeerDto = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
};

export type Conversation =
  | {
      kind: 'direct';
      peerUserId: string;
      peer: ChatPeerDto;
      lastMessage: {
        id: number;
        senderId: string;
        recipientId: string;
        body: string;
        createdAt: string;
      };
      unreadCount: number;
    }
  | {
      kind: 'group';
      groupId: number;
      name: string;
      lastMessage: {
        id: number;
        groupId: number;
        senderId: string;
        body: string;
        createdAt: string;
      } | null;
      unreadCount: number;
    };

export type ChatDockContextValue = {
  dock: DockState;
  messagesByThread: Record<string, MsgRow[]>;
  pickerOpen: boolean;
  setPickerOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  groupModalOpen: boolean;
  setGroupModalOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  hubOpen: boolean;
  setHubOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  toggleHub: () => void;
  conversations: Conversation[];
  refetchConversations: () => Promise<void>;
  unreadChatTotal: number;
  threadPaging: Record<string, { hasMoreOlder: boolean }>;
  loadingOlderThread: Record<string, boolean>;
  loadOlderMessages: (threadKey: string) => Promise<void>;
  typingUsersByThread: Record<string, Set<string>>;
  emitTypingDebounced: (threadKey: string) => void;
  openThread: (threadKey: string) => void;
  openDirectChat: (peerId: string) => void;
  openGroupChat: (groupId: number) => void;
  closeChat: (threadKey: string) => void;
  minimizeChat: (threadKey: string) => void;
  promoteFromQueue: (threadKey: string) => void;
  sendText: (threadKey: string, text: string) => Promise<void>;
  loadHistory: (threadKey: string) => Promise<void>;
  createGroup: (input: { name: string; memberUserIds: string[] }) => Promise<{ id: number }>;
  subscribeGroupSocket: (groupId: number) => void;
  registerChatUsers: (users: ChatPeerDto[]) => void;
  getChatUser: (id: string) => ChatPeerDto | undefined;
  /** Tăng khi `registerChatUsers` chạy — chỉ để subscriber biết cache user đổi (có thể bỏ qua). */
  userDirectoryVersion: number;
};

const ChatDockContext = createContext<ChatDockContextValue | null>(null);

function dedupeMessagesSorted(arr: MsgRow[]): MsgRow[] {
  const byKey = new Map<string, MsgRow>();
  for (const m of arr) {
    if (m?.id == null) continue;
    const k = String(m.id);
    const prev = byKey.get(k);
    if (!prev) {
      byKey.set(k, m);
      continue;
    }
    const tNew = new Date(m.createdAt).getTime();
    const tOld = new Date(prev.createdAt).getTime();
    if (Number.isFinite(tNew) && (!Number.isFinite(tOld) || tNew >= tOld)) {
      byKey.set(k, m);
    }
  }
  const out = [...byKey.values()];
  out.sort((x, y) => {
    const tx = new Date(x.createdAt).getTime();
    const ty = new Date(y.createdAt).getTime();
    return (Number.isFinite(tx) ? tx : 0) - (Number.isFinite(ty) ? ty : 0);
  });
  return out;
}

function notifyError(message: string) {
  window.alert(message);
}

export function ChatDockProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();
  const user = session?.user ?? null;
  const userId = user?.id ?? null;

  const [dock, dispatch] = useReducer(dockReducer, initialDock);
  const [messagesByThread, setMessagesByThread] = useState<Record<string, MsgRow[]>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  const [threadPaging, setThreadPaging] = useState<Record<string, { hasMoreOlder: boolean }>>({});
  const [loadingOlderThread, setLoadingOlderThread] = useState<Record<string, boolean>>({});
  const [typingUsersByThread, setTypingUsersByThread] = useState<Record<string, Set<string>>>({});

  const dockRef = useRef(dock);
  dockRef.current = dock;
  const userRef = useRef(userId);
  userRef.current = userId;

  const typingClearTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const typingDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const sendDedupeRef = useRef({ key: '', at: 0 });
  const ackSeenRef = useRef(new Set<string>());
  const socketEventSeenRef = useRef(new Set<string>());
  const userByIdRef = useRef<Map<string, ChatPeerDto>>(new Map());
  const [userMapTick, setUserMapTick] = useState(0);

  const getChatUser = useCallback((id: string) => userByIdRef.current.get(id), []);

  const refetchConversations = useCallback(async () => {
    if (!userId) {
      setConversations([]);
      return;
    }
    const res = await apiFetch<Conversation[]>('/chat/conversations');
    if (res.success) setConversations(res.data);
  }, [userId]);

  const unreadChatTotal = useMemo(
    () => conversations.reduce((s, c) => s + (Number(c.unreadCount) || 0), 0),
    [conversations],
  );

  useEffect(() => {
    if (!userId) {
      dispatch({ type: 'RESET' });
      setPickerOpen(false);
      setGroupModalOpen(false);
      setHubOpen(false);
      setConversations([]);
      setThreadPaging({});
      setLoadingOlderThread({});
      setTypingUsersByThread({});
      setMessagesByThread({});
      return;
    }
    void refetchConversations();
  }, [userId, refetchConversations]);

  useEffect(() => {
    if (hubOpen && userId) void refetchConversations();
  }, [hubOpen, userId, refetchConversations]);

  const loadHistory = useCallback(async (threadKey: string) => {
    const parsed = parseChatThreadKey(threadKey);
    if (!parsed) return;
    try {
      const url =
        parsed.type === 'direct'
          ? `/chat/messages/${encodeURIComponent(parsed.id)}?limit=${CHAT_PAGE_SIZE}`
          : `/chat/groups/${parsed.id}/messages?limit=${CHAT_PAGE_SIZE}`;
      const res = await apiFetch<MsgRow[]>(url);
      if (!res.success) return;
      const list = dedupeMessagesSorted(res.data);
      setMessagesByThread((prev) => ({ ...prev, [threadKey]: list }));
      setThreadPaging((p) => ({
        ...p,
        [threadKey]: { hasMoreOlder: list.length >= CHAT_PAGE_SIZE },
      }));
    } catch {
      notifyError('Không tải được lịch sử chat');
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
        const url =
          parsed.type === 'direct'
            ? `/chat/messages/${encodeURIComponent(parsed.id)}?limit=${CHAT_PAGE_SIZE}&before=${oldest.id}`
            : `/chat/groups/${parsed.id}/messages?limit=${CHAT_PAGE_SIZE}&before=${oldest.id}`;
        const res = await apiFetch<MsgRow[]>(url);
        const older = res.success ? res.data : [];
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
        notifyError('Không tải thêm tin nhắn');
      } finally {
        setLoadingOlderThread((x) => ({ ...x, [threadKey]: false }));
      }
    },
    [messagesByThread, threadPaging, loadingOlderThread],
  );

  const bumpTypingUser = useCallback((threadKey: string, uid: string) => {
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
  }, [userId]);

  const refetchConversationsRef = useRef(refetchConversations);
  refetchConversationsRef.current = refetchConversations;
  const bumpTypingUserRef = useRef(bumpTypingUser);
  bumpTypingUserRef.current = bumpTypingUser;

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

  const markThreadRead = useCallback(
    async (threadKey: string) => {
      const parsed = parseChatThreadKey(threadKey);
      if (!parsed) return;
      try {
        if (parsed.type === 'direct') {
          await apiFetch('/chat/direct/read', {
            method: 'POST',
            body: JSON.stringify({ peerUserId: parsed.id }),
          });
        } else {
          await apiFetch(`/chat/groups/${parsed.id}/read`, {
            method: 'POST',
            body: JSON.stringify({}),
          });
        }
        void refetchConversations();
      } catch {
        /* ignore */
      }
    },
    [refetchConversations],
  );

  const prevSlotsRef = useRef(initialDock.slots);

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

  useEffect(() => {
    if (!userId) {
      resetChatSocket();
      setMessagesByThread({});
      socketEventSeenRef.current = new Set();
      ackSeenRef.current = new Set();
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
  }, [userId]);

  const openThread = useCallback(
    (threadKey: string) => {
      if (!userId || threadKey == null) return;
      const parsed = parseChatThreadKey(threadKey);
      if (parsed?.type === 'direct' && parsed.id === userId) return;
      dispatch({ type: 'OPEN', threadKey });
    },
    [userId],
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

  const closeChat = useCallback((threadKey: string) => {
    dispatch({ type: 'CLOSE', threadKey });
  }, []);

  const minimizeChat = useCallback((threadKey: string) => {
    dispatch({ type: 'MINIMIZE', threadKey });
  }, []);

  const promoteFromQueue = useCallback((threadKey: string) => {
    dispatch({ type: 'PROMOTE', threadKey });
  }, []);

  const subscribeGroupSocket = useCallback((groupId: number) => {
    getChatSocketInstance()?.emit('group:subscribe', { groupId }, () => undefined);
  }, []);

  const appendOutgoingMessage = useCallback((threadKey: string, m: MsgRow) => {
    setMessagesByThread((prev) => ({
      ...prev,
      [threadKey]: dedupeMessagesSorted([...(prev[threadKey] ?? []), m]),
    }));
  }, []);

  const sendText = useCallback(
    async (threadKey: string, text: string) => {
      let s = getChatSocketInstance();
      if (!s?.connected) {
        try {
          s = await getChatSocket();
        } catch {
          notifyError('Chưa kết nối chat — thử tải lại trang.');
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
              notifyError(ack.error || 'Gửi tin nhắn thất bại');
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
            notifyError(ack.error || 'Gửi tin nhắn thất bại');
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

  const createGroup = useCallback(
    async ({ name, memberUserIds }: { name: string; memberUserIds: string[] }) => {
      const res = await apiFetch<{ id: number }>('/chat/groups', {
        method: 'POST',
        body: JSON.stringify({ name, memberUserIds }),
      });
      if (!res.success) {
        notifyError(res.error.message);
        throw new Error(res.error.message);
      }
      subscribeGroupSocket(res.data.id);
      await refetchConversations();
      openGroupChat(res.data.id);
      return res.data;
    },
    [openGroupChat, refetchConversations, subscribeGroupSocket],
  );

  /** Cập nhật map user (avatar/tên) cho UI dock — gọi từ Messenger khi load danh sách user. */
  const registerChatUsers = useCallback((users: ChatPeerDto[]) => {
    const m = new Map(userByIdRef.current);
    for (const u of users) m.set(u.id, u);
    userByIdRef.current = m;
    setUserMapTick((t) => t + 1);
  }, []);

  const value = useMemo(
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
      userDirectoryVersion: userMapTick,
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
      userMapTick,
    ],
  );

  return <ChatDockContext.Provider value={value}>{children}</ChatDockContext.Provider>;
}

export function useChatDock() {
  const ctx = useContext(ChatDockContext);
  if (!ctx) throw new Error('useChatDock must be used within ChatDockProvider');
  return ctx;
}

export function useChatDockOptional() {
  return useContext(ChatDockContext);
}

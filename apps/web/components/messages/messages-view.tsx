'use client';

import { Loader2, Plus, Send, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Socket } from 'socket.io-client';

import { apiFetch } from '@/lib/api-client';
import { authClient } from '@/lib/auth-client';
import { getChatSocket } from '@/lib/chat-socket';
import { cn } from '@/lib/utils';

type PeerDto = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
};

type DirectConv = {
  kind: 'direct';
  peerUserId: string;
  peer: PeerDto;
  lastMessage: {
    id: number;
    senderId: string;
    recipientId: string;
    body: string;
    createdAt: string;
  };
  unreadCount: number;
};

type GroupConv = {
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

type Conversation = DirectConv | GroupConv;

type DirectMsg = {
  id: number;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
};

type GroupMsg = {
  id: number;
  groupId: number;
  senderId: string;
  body: string;
  createdAt: string;
};

function peerLabel(p: PeerDto) {
  return p.name?.trim() || `@${p.username}`;
}

function NewChatModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (userId: string) => void;
}) {
  const { data: session } = authClient.useSession();
  const meId = session?.user?.id;
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<PeerDto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQ('');
      setUsers([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
    void apiFetch<PeerDto[]>(`/users${qs}`).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.success) return;
      setUsers(res.data.filter((u) => u.id !== meId));
    });
    return () => {
      cancelled = true;
    };
  }, [open, q, meId]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 p-4 pt-24 backdrop-blur-sm supports-[backdrop-filter]:bg-black/30 sm:pt-28"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[min(70dvh,32rem)] w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-chat-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="new-chat-title" className="text-sm font-semibold text-foreground">
            Tin nhắn mới
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="border-b border-border px-3 py-2">
          <label htmlFor="new-chat-search" className="sr-only">
            Tìm người dùng
          </label>
          <input
            id="new-chat-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên hoặc @username…"
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            autoFocus
          />
        </div>
        <ul className="max-h-[min(50dvh,24rem)] overflow-y-auto p-2">
          {loading ? (
            <li className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            </li>
          ) : users.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              Không có người dùng phù hợp.
            </li>
          ) : (
            users.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className="flex w-full min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => {
                    onPick(u.id);
                    onClose();
                  }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-foreground">
                    {(u.name?.[0] || u.username[0] || '?').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{peerLabel(u)}</p>
                    <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

export function MessagesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const peer = searchParams.get('peer');
  const groupStr = searchParams.get('group');
  const groupId = groupStr != null && groupStr !== '' ? Number(groupStr) : NaN;
  const activeGroup = Number.isFinite(groupId) && groupId > 0 ? groupId : null;

  const { data: session } = authClient.useSession();
  const meId = session?.user?.id ?? null;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [messages, setMessages] = useState<(DirectMsg | GroupMsg)[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [chatSocket, setChatSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!meId) {
      setChatSocket(null);
      return;
    }
    let cancelled = false;
    void getChatSocket()
      .then((s) => {
        if (!cancelled) setChatSocket(s);
      })
      .catch(() => {
        if (!cancelled) setChatSocket(null);
      });
    return () => {
      cancelled = true;
    };
  }, [meId]);

  const loadConversations = useCallback(async () => {
    if (!meId) return;
    setConvLoading(true);
    const res = await apiFetch<Conversation[]>('/chat/conversations');
    if (res.success) setConversations(res.data);
    setConvLoading(false);
  }, [meId]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const loadDirectMessages = useCallback(async (peerUserId: string) => {
    setMsgLoading(true);
    const res = await apiFetch<DirectMsg[]>(`/chat/messages/${encodeURIComponent(peerUserId)}`);
    if (res.success) setMessages(res.data);
    setMsgLoading(false);
    void apiFetch('/chat/direct/read', {
      method: 'POST',
      body: JSON.stringify({ peerUserId }),
    });
  }, []);

  const loadGroupMessages = useCallback(async (gid: number) => {
    setMsgLoading(true);
    const res = await apiFetch<GroupMsg[]>(`/chat/groups/${gid}/messages`);
    if (res.success) setMessages(res.data);
    setMsgLoading(false);
    void apiFetch(`/chat/groups/${gid}/read`, { method: 'POST', body: JSON.stringify({}) });
  }, []);

  useEffect(() => {
    if (!meId) return;
    if (peer && !activeGroup) {
      void loadDirectMessages(peer);
      return;
    }
    if (activeGroup) {
      void loadGroupMessages(activeGroup);
      return;
    }
    setMessages([]);
  }, [meId, peer, activeGroup, loadDirectMessages, loadGroupMessages]);

  useEffect(() => {
    if (!chatSocket || !activeGroup) return;
    chatSocket.emit('group:subscribe', { groupId: activeGroup }, () => undefined);
  }, [chatSocket, activeGroup]);

  useEffect(() => {
    if (!chatSocket || !meId) return;

    const onDirect = (payload: {
      kind: string;
      id: number;
      senderId: string;
      recipientId: string;
      body: string;
      createdAt: string;
    }) => {
      if (payload.kind !== 'direct') return;
      const openPeer = peer && !activeGroup ? peer : null;
      const involved =
        (payload.senderId === meId && payload.recipientId === openPeer) ||
        (payload.recipientId === meId && payload.senderId === openPeer);
      if (involved && openPeer) {
        setMessages((prev) => {
          if (prev.some((m) => 'recipientId' in m && m.id === payload.id)) return prev;
          return [
            ...prev,
            {
              id: payload.id,
              senderId: payload.senderId,
              recipientId: payload.recipientId,
              body: payload.body,
              createdAt: payload.createdAt,
            },
          ];
        });
      }
      void loadConversations();
    };

    const onGroup = (payload: {
      kind: string;
      id: number;
      groupId: number;
      senderId: string;
      body: string;
      createdAt: string;
    }) => {
      if (payload.kind !== 'group') return;
      if (activeGroup === payload.groupId) {
        setMessages((prev) => {
          if (prev.some((m) => 'groupId' in m && m.id === payload.id)) return prev;
          return [
            ...prev,
            {
              id: payload.id,
              groupId: payload.groupId,
              senderId: payload.senderId,
              body: payload.body,
              createdAt: payload.createdAt,
            },
          ];
        });
      }
      void loadConversations();
    };

    chatSocket.on('chat:message', onDirect);
    chatSocket.on('chat:group:message', onGroup);
    return () => {
      chatSocket.off('chat:message', onDirect);
      chatSocket.off('chat:group:message', onGroup);
    };
  }, [chatSocket, meId, peer, activeGroup, loadConversations]);

  const title = useMemo(() => {
    if (peer && !activeGroup) {
      const c = conversations.find(
        (x): x is DirectConv => x.kind === 'direct' && x.peerUserId === peer,
      );
      return c ? peerLabel(c.peer) : `Cuộc chat`;
    }
    if (activeGroup) {
      const c = conversations.find(
        (x): x is GroupConv => x.kind === 'group' && x.groupId === activeGroup,
      );
      return c?.name ?? `Nhóm #${activeGroup}`;
    }
    return 'Tin nhắn';
  }, [peer, activeGroup, conversations]);

  async function onSend() {
    const text = draft.trim();
    if (!text || !meId || sending) return;
    setSending(true);
    let s: Socket;
    try {
      s = await getChatSocket();
    } catch {
      setSending(false);
      return;
    }
    if (peer && !activeGroup) {
      await new Promise<void>((resolve) => {
        s.emit('chat:send', { peerUserId: peer, text }, (ack: { ok?: boolean; message?: DirectMsg }) => {
          if (ack?.ok && ack.message) {
            setMessages((prev) =>
              prev.some((m) => 'recipientId' in m && m.id === ack.message!.id)
                ? prev
                : [...prev, ack.message!],
            );
            setDraft('');
            void loadConversations();
          }
          resolve();
        });
      });
    } else if (activeGroup) {
      await new Promise<void>((resolve) => {
        s.emit('group:send', { groupId: activeGroup, text }, (ack: { ok?: boolean; message?: GroupMsg }) => {
          if (ack?.ok && ack.message) {
            setMessages((prev) =>
              prev.some((m) => 'groupId' in m && m.id === ack.message!.id) ? prev : [...prev, ack.message!],
            );
            setDraft('');
            void loadConversations();
          }
          resolve();
        });
      });
    }
    setSending(false);
  }

  if (!meId) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-muted-foreground">Đăng nhập để xem tin nhắn.</p>
        <Link
          href="/login?next=/messages"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-5xl flex-col gap-0 md:flex-row md:border-x md:border-border">
        <aside className="flex w-full flex-col border-b border-border md:w-72 md:border-b-0 md:border-r md:border-border md:pt-0">
          <div className="flex items-center justify-between gap-2 border-b border-border p-3">
            <h1 className="text-sm font-semibold text-foreground">Hội thoại</h1>
            <button
              type="button"
              onClick={() => setNewChatOpen(true)}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Tin nhắn mới"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          <div className="max-h-[40dvh] overflow-y-auto md:max-h-none md:flex-1">
            {convLoading ? (
              <div className="flex justify-center py-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              </div>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Chưa có hội thoại. Bắt đầu chat mới.</p>
            ) : (
              <ul>
                {conversations.map((c) => {
                  if (c.kind === 'direct') {
                    const active = peer === c.peerUserId && !activeGroup;
                    return (
                      <li key={`d-${c.peerUserId}`}>
                        <button
                          type="button"
                          onClick={() => router.replace(`/messages?peer=${encodeURIComponent(c.peerUserId)}`)}
                          className={cn(
                            'flex w-full min-h-11 items-center gap-3 px-3 py-3 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            active && 'bg-muted',
                          )}
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {(c.peer.name?.[0] || c.peer.username[0] || '?').toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-foreground">{peerLabel(c.peer)}</p>
                            <p className="truncate text-xs text-muted-foreground">{c.lastMessage.body}</p>
                          </div>
                          {c.unreadCount > 0 ? (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                              {c.unreadCount}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  }
                  const active = activeGroup === c.groupId;
                  return (
                    <li key={`g-${c.groupId}`}>
                      <button
                        type="button"
                        onClick={() => router.replace(`/messages?group=${c.groupId}`)}
                        className={cn(
                          'flex w-full min-h-11 items-center gap-3 px-3 py-3 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          active && 'bg-muted',
                        )}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Users className="h-5 w-5" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">{c.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {c.lastMessage?.body ?? 'Chưa có tin nhắn'}
                          </p>
                        </div>
                        {c.unreadCount > 0 ? (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                            {c.unreadCount}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section className="flex min-h-[50dvh] flex-1 flex-col bg-background md:min-h-0">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {!peer && !activeGroup ? (
              <p className="mt-1 text-xs text-muted-foreground">Chọn một hội thoại hoặc tạo tin nhắn mới.</p>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {msgLoading ? (
                <div className="flex justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                </div>
              ) : messages.length === 0 && (peer || activeGroup) ? (
                <p className="text-center text-sm text-muted-foreground">Chưa có tin nhắn. Gửi lời chào!</p>
              ) : (
                messages.map((m) => {
                  const mine = m.senderId === meId;
                  return (
                    <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                          mine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <p
                          className={cn(
                            'mt-1 text-[10px] opacity-80',
                            mine ? 'text-primary-foreground' : 'text-muted-foreground',
                          )}
                        >
                          {new Date(m.createdAt).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {peer || activeGroup ? (
              <form
                className="flex gap-2 border-t border-border p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void onSend();
                }}
              >
                <label htmlFor="chat-draft" className="sr-only">
                  Nội dung tin nhắn
                </label>
                <input
                  id="chat-draft"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Nhập tin nhắn…"
                  className="min-h-11 flex-1 rounded-full border border-border bg-muted/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  maxLength={8000}
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Gửi"
                >
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
              </form>
            ) : null}
          </div>
        </section>
      </div>

      <NewChatModal
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onPick={(userId) => router.replace(`/messages?peer=${encodeURIComponent(userId)}`)}
      />
    </>
  );
}

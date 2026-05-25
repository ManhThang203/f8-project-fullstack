'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Send, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { Socket } from 'socket.io-client';

import {
  EMPTY_CONVERSATIONS,
  EMPTY_DIRECT_MESSAGES,
  EMPTY_GROUP_MESSAGES,
  type DirectMsg,
  type GroupMsg,
  useChatConversations,
  useDirectMessages,
  useGroupMessages,
  useInvalidateChatConversations,
} from '@/hooks/queries/use-chat-queries';
import {
  EMPTY_USER_SEARCH,
  useUsersSearch,
} from '@/hooks/queries/use-users-search';
import { useDebounced } from '@/hooks/use-debounced';
import { authClient } from '@/lib/auth-client';
import { getChatSocket } from '@/lib/chat-socket';
import { queryKeys } from '@/lib/query-keys';
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
  const debouncedQ = useDebounced(q, 300);

  const { data: usersData, isLoading: loading } = useUsersSearch(debouncedQ, {
    enabled: open,
    excludeUserId: meId,
  });
  const users = usersData ?? EMPTY_USER_SEARCH;

  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 p-4 pt-24 backdrop-blur-sm supports-[backdrop-filter]:bg-black/30 sm:pt-28"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="border-border bg-card max-h-[min(70dvh,32rem)] w-full max-w-md overflow-hidden rounded-2xl border shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-chat-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <h2 id="new-chat-title" className="text-foreground text-sm font-semibold">
            Tin nhắn mới
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:bg-muted focus-visible:ring-ring flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="border-border border-b px-3 py-2">
          <label htmlFor="new-chat-search" className="sr-only">
            Tìm người dùng
          </label>
          <input
            id="new-chat-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên hoặc @username…"
            className="border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring h-10 w-full rounded-lg border px-3 text-sm focus-visible:outline-none focus-visible:ring-2"
            autoFocus
          />
        </div>
        <ul className="max-h-[min(50dvh,24rem)] overflow-y-auto p-2">
          {loading ? (
            <li className="text-muted-foreground flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            </li>
          ) : users.length === 0 ? (
            <li className="text-muted-foreground px-3 py-6 text-center text-sm">
              Không có người dùng phù hợp.
            </li>
          ) : (
            users.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className="hover:bg-muted focus-visible:ring-ring flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
                  onClick={() => {
                    onPick(u.id);
                    onClose();
                  }}
                >
                  <div className="bg-muted text-foreground flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold">
                    {(u.name?.[0] || u.username[0] || '?').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground truncate font-medium">{peerLabel(u)}</p>
                    <p className="text-muted-foreground truncate text-xs">@{u.username}</p>
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
  const queryClient = useQueryClient();
  const invalidateConversations = useInvalidateChatConversations();
  const searchParams = useSearchParams();
  const peer = searchParams.get('peer');
  const groupStr = searchParams.get('group');
  const groupId = groupStr != null && groupStr !== '' ? Number(groupStr) : NaN;
  const activeGroup = Number.isFinite(groupId) && groupId > 0 ? groupId : null;

  const { data: session } = authClient.useSession();
  const meId = session?.user?.id ?? null;

  const { data: conversationsData, isLoading: convLoading } = useChatConversations(Boolean(meId));
  const conversations = conversationsData ?? EMPTY_CONVERSATIONS;

  const activePeer = peer && !activeGroup ? peer : null;
  const { data: directData, isLoading: directLoading } = useDirectMessages(
    activePeer,
    Boolean(meId),
  );
  const { data: groupData, isLoading: groupLoading } = useGroupMessages(
    activeGroup,
    Boolean(meId),
  );

  const directMessages = directData ?? EMPTY_DIRECT_MESSAGES;
  const groupMessages = groupData ?? EMPTY_GROUP_MESSAGES;

  const messages: (DirectMsg | GroupMsg)[] = activeGroup
    ? groupMessages
    : activePeer
      ? directMessages
      : [];
  const msgLoading = activeGroup ? groupLoading : activePeer ? directLoading : false;

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
        queryClient.setQueryData<DirectMsg[]>(
          queryKeys.chat.directMessages(openPeer),
          (prev) => {
            if (!prev) return prev;
            if (prev.some((m) => m.id === payload.id)) return prev;
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
          },
        );
      }
      invalidateConversations();
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
        queryClient.setQueryData<GroupMsg[]>(
          queryKeys.chat.groupMessages(activeGroup),
          (prev) => {
            if (!prev) return prev;
            if (prev.some((m) => m.id === payload.id)) return prev;
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
          },
        );
      }
      invalidateConversations();
    };

    chatSocket.on('chat:message', onDirect);
    chatSocket.on('chat:group:message', onGroup);
    return () => {
      chatSocket.off('chat:message', onDirect);
      chatSocket.off('chat:group:message', onGroup);
    };
  }, [chatSocket, meId, peer, activeGroup, invalidateConversations, queryClient]);

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
        s.emit(
          'chat:send',
          { peerUserId: peer, text },
          (ack: { ok?: boolean; message?: DirectMsg }) => {
            if (ack?.ok && ack.message) {
              queryClient.setQueryData<DirectMsg[]>(
                queryKeys.chat.directMessages(peer),
                (prev) => {
                  const list = prev ?? [];
                  if (list.some((m) => m.id === ack.message!.id)) return list;
                  return [...list, ack.message!];
                },
              );
              setDraft('');
              invalidateConversations();
            }
            resolve();
          },
        );
      });
    } else if (activeGroup) {
      await new Promise<void>((resolve) => {
        s.emit(
          'group:send',
          { groupId: activeGroup, text },
          (ack: { ok?: boolean; message?: GroupMsg }) => {
            if (ack?.ok && ack.message) {
              queryClient.setQueryData<GroupMsg[]>(
                queryKeys.chat.groupMessages(activeGroup),
                (prev) => {
                  const list = prev ?? [];
                  if (list.some((m) => m.id === ack.message!.id)) return list;
                  return [...list, ack.message!];
                },
              );
              setDraft('');
              invalidateConversations();
            }
            resolve();
          },
        );
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
          className="bg-primary text-primary-foreground focus-visible:ring-ring mt-4 inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="md:border-border mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-5xl flex-col gap-0 md:flex-row md:border-x">
        <aside className="border-border md:border-border flex w-full flex-col border-b md:w-72 md:border-b-0 md:border-r md:pt-0">
          <div className="border-border flex items-center justify-between gap-2 border-b p-3">
            <h1 className="text-foreground text-sm font-semibold">Hội thoại</h1>
            <button
              type="button"
              onClick={() => setNewChatOpen(true)}
              className="text-muted-foreground hover:bg-muted focus-visible:ring-ring flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2"
              aria-label="Tin nhắn mới"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          <div className="max-h-[40dvh] overflow-y-auto md:max-h-none md:flex-1">
            {convLoading ? (
              <div className="text-muted-foreground flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-muted-foreground p-4 text-sm">
                Chưa có hội thoại. Bắt đầu chat mới.
              </p>
            ) : (
              <ul>
                {conversations.map((c) => {
                  if (c.kind === 'direct') {
                    const active = peer === c.peerUserId && !activeGroup;
                    return (
                      <li key={`d-${c.peerUserId}`}>
                        <button
                          type="button"
                          onClick={() =>
                            router.replace(`/messages?peer=${encodeURIComponent(c.peerUserId)}`)
                          }
                          className={cn(
                            'hover:bg-muted focus-visible:ring-ring flex min-h-11 w-full items-center gap-3 px-3 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2',
                            active && 'bg-muted',
                          )}
                        >
                          <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                            {(c.peer.name?.[0] || c.peer.username[0] || '?').toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-foreground truncate font-medium">
                              {peerLabel(c.peer)}
                            </p>
                            <p className="text-muted-foreground truncate text-xs">
                              {c.lastMessage.body}
                            </p>
                          </div>
                          {c.unreadCount > 0 ? (
                            <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
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
                          'hover:bg-muted focus-visible:ring-ring flex min-h-11 w-full items-center gap-3 px-3 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2',
                          active && 'bg-muted',
                        )}
                      >
                        <div className="bg-muted text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                          <Users className="h-5 w-5" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-foreground truncate font-medium">{c.name}</p>
                          <p className="text-muted-foreground truncate text-xs">
                            {c.lastMessage?.body ?? 'Chưa có tin nhắn'}
                          </p>
                        </div>
                        {c.unreadCount > 0 ? (
                          <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
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

        <section className="bg-background flex min-h-[50dvh] flex-1 flex-col md:min-h-0">
          <div className="border-border border-b px-4 py-3">
            <h2 className="text-foreground text-sm font-semibold">{title}</h2>
            {!peer && !activeGroup ? (
              <p className="text-muted-foreground mt-1 text-xs">
                Chọn một hội thoại hoặc tạo tin nhắn mới.
              </p>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {msgLoading ? (
                <div className="text-muted-foreground flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                </div>
              ) : messages.length === 0 && (peer || activeGroup) ? (
                <p className="text-muted-foreground text-center text-sm">
                  Chưa có tin nhắn. Gửi lời chào!
                </p>
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
                className="border-border flex gap-2 border-t p-3"
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
                  className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus-visible:ring-ring min-h-11 flex-1 rounded-full border px-4 text-sm focus-visible:outline-none focus-visible:ring-2"
                  maxLength={8000}
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="bg-primary text-primary-foreground focus-visible:ring-ring flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 disabled:opacity-40"
                  aria-label="Gửi"
                >
                  {sending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
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

'use client';

import {
  ChevronDown,
  Loader2,
  MessageCircle,
  Minimize2,
  Plus,
  Send,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';

import type { ChatPeerDto, Conversation } from '@/components/chat/chat-dock-context';
import { useChatDock } from '@/components/chat/chat-dock-context';
import { apiFetch } from '@/lib/api-client';
import { authClient } from '@/lib/auth-client';
import { parseChatThreadKey } from '@/lib/chat-thread-keys';
import { cn } from '@/lib/utils';

/** Cùng tham chiếu khi thread chưa có tin — tránh `?? []` tạo array mới mỗi render. */
const EMPTY_MESSAGE_LIST: [] = [];

function peerLabel(u: Pick<ChatPeerDto, 'name' | 'username'>) {
  return u.name?.trim() || `@${u.username}`;
}

function threadMeta(
  threadKey: string,
  conversations: Conversation[],
  getChatUser: (id: string) => ChatPeerDto | undefined,
) {
  const parsed = parseChatThreadKey(threadKey);
  if (!parsed) {
    return { title: '', subtitle: '', isGroup: false, avatarUrl: null as string | null };
  }
  if (parsed.type === 'group') {
    const c = conversations.find(
      (x): x is Extract<Conversation, { kind: 'group' }> =>
        x.kind === 'group' && x.groupId === parsed.id,
    );
    return {
      title: c?.name ?? `Nhóm #${parsed.id}`,
      subtitle: 'Nhóm',
      isGroup: true,
      avatarUrl: null as string | null,
    };
  }
  const c = conversations.find(
    (x): x is Extract<Conversation, { kind: 'direct' }> =>
      x.kind === 'direct' && x.peerUserId === parsed.id,
  );
  const p = c?.peer ?? getChatUser(parsed.id);
  return {
    title: p ? peerLabel(p) : `Chat ${parsed.id.slice(0, 8)}…`,
    subtitle: p ? `@${p.username}` : '',
    isGroup: false,
    avatarUrl: p?.image ?? null,
  };
}

function ChatUserPickerModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (userId: string) => void;
}) {
  const { registerChatUsers } = useChatDock();
  const { data: session } = authClient.useSession();
  const meId = session?.user?.id;
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<ChatPeerDto[]>([]);
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
    void apiFetch<ChatPeerDto[]>(`/users${qs}`).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.success) return;
      const list = res.data.filter((u) => u.id !== meId);
      setUsers(list);
      registerChatUsers(list);
    });
    return () => {
      cancelled = true;
    };
  }, [open, q, meId, registerChatUsers]);

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
        aria-labelledby="dock-chat-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="dock-chat-picker-title" className="text-sm font-semibold text-foreground">
            Chọn người để nhắn
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
          <label htmlFor="dock-chat-picker-search" className="sr-only">
            Tìm người dùng
          </label>
          <input
            id="dock-chat-picker-search"
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
                  {u.image ? (
                    <img
                      src={u.image}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                      {(u.name?.[0] || u.username[0] || '?').toUpperCase()}
                    </div>
                  )}
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

function GroupCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { registerChatUsers, createGroup } = useChatDock();
  const { data: session } = authClient.useSession();
  const meId = session?.user?.id;
  const [name, setName] = useState('');
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<ChatPeerDto[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setName('');
      setQ('');
      setUsers([]);
      setPicked(new Set());
      return;
    }
    let cancelled = false;
    setLoadingUsers(true);
    const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
    void apiFetch<ChatPeerDto[]>(`/users${qs}`).then((res) => {
      if (cancelled) return;
      setLoadingUsers(false);
      if (!res.success) return;
      const list = res.data.filter((u) => u.id !== meId);
      setUsers(list);
      registerChatUsers(list);
    });
    return () => {
      cancelled = true;
    };
  }, [open, q, meId, registerChatUsers]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || picked.size === 0 || submitting) return;
    setSubmitting(true);
    try {
      await createGroup({ name: trimmed, memberUserIds: [...picked] });
      onClose();
    } catch {
      /* notifyError in context */
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 p-4 pt-20 backdrop-blur-sm supports-[backdrop-filter]:bg-black/30 sm:pt-24"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[min(80dvh,36rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dock-group-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="dock-group-title" className="text-sm font-semibold text-foreground">
            Tạo nhóm
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
        <form onSubmit={(e) => void onSubmit(e)} className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-border px-4 py-3">
            <label htmlFor="dock-group-name" className="mb-1 block text-xs text-muted-foreground">
              Tên nhóm
            </label>
            <input
              id="dock-group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Ví dụ: Team design"
              maxLength={120}
            />
          </div>
          <div className="border-b border-border px-3 py-2">
            <label htmlFor="dock-group-user-search" className="sr-only">
              Thêm thành viên
            </label>
            <input
              id="dock-group-user-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm thành viên…"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <ul className="max-h-[min(40dvh,18rem)] flex-1 overflow-y-auto p-2">
            {loadingUsers ? (
              <li className="flex justify-center py-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              </li>
            ) : users.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                Không có người dùng phù hợp.
              </li>
            ) : (
              users.map((u) => {
                const on = picked.has(u.id);
                return (
                  <li key={u.id}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => {
                          setPicked((prev) => {
                            const next = new Set(prev);
                            if (next.has(u.id)) next.delete(u.id);
                            else next.add(u.id);
                            return next;
                          });
                        }}
                        className="h-4 w-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <span className="font-medium text-foreground">{peerLabel(u)}</span>
                      <span className="text-xs text-muted-foreground">@{u.username}</span>
                    </label>
                  </li>
                );
              })
            )}
          </ul>
          <div className="border-t border-border p-3">
            <button
              type="submit"
              disabled={submitting || !name.trim() || picked.size === 0}
              className="flex min-h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                'Tạo nhóm'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChatHubPanel({
  conversations,
  onSelectDirect,
  onSelectGroup,
}: {
  conversations: Conversation[];
  onSelectDirect: (peerUserId: string) => void;
  onSelectGroup: (groupId: number) => void;
}) {
  const dock = useChatDock();

  return (
    <div
      className={cn(
        /* Ngay dưới header (h-14 = 3.5rem), căn phải giống panel Messenger FB */
        'fixed top-14 right-3 z-[55] flex w-[min(100vw-1.5rem,20rem)] max-h-[min(70dvh,calc(100dvh-4rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg transition-[opacity,transform] duration-200 motion-reduce:transition-none sm:right-4',
        dock.hubOpen
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none -translate-y-1 opacity-0',
      )}
      aria-hidden={!dock.hubOpen}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-sm font-semibold text-foreground">Tin nhắn</p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => dock.setPickerOpen(true)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Chat mới"
          >
            <Plus className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => dock.setGroupModalOpen(true)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Tạo nhóm"
          >
            <Users className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => dock.setHubOpen(false)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Đóng danh sách"
          >
            <ChevronDown className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>
      <div className="border-b border-border px-3 py-2">
        <Link
          href="/messages"
          className="block min-h-11 rounded-lg px-2 py-2 text-center text-sm font-medium text-primary transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => dock.setHubOpen(false)}
        >
          Mở trang tin nhắn đầy đủ
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Chưa có hội thoại.</p>
        ) : (
          <ul>
            {conversations.map((c) => {
              if (c.kind === 'direct') {
                return (
                  <li key={`d-${c.peerUserId}`}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectDirect(c.peerUserId);
                        dock.setHubOpen(false);
                      }}
                      className="flex w-full min-h-11 items-center gap-2 px-3 py-3 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {c.peer.image ? (
                        <img
                          src={c.peer.image}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                          {(c.peer.name?.[0] || c.peer.username[0] || '?').toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{peerLabel(c.peer)}</p>
                        <p className="truncate text-xs text-muted-foreground">{c.lastMessage.body}</p>
                      </div>
                      {c.unreadCount > 0 ? (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                          {c.unreadCount > 99 ? '99+' : c.unreadCount}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              }
              return (
                <li key={`g-${c.groupId}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectGroup(c.groupId);
                      dock.setHubOpen(false);
                    }}
                    className="flex w-full min-h-11 items-center gap-2 px-3 py-3 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Users className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.lastMessage?.body ?? 'Chưa có tin nhắn'}
                      </p>
                    </div>
                    {c.unreadCount > 0 ? (
                      <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        {c.unreadCount > 99 ? '99+' : c.unreadCount}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function ChatWindowFrame({ threadKey }: { threadKey: string }) {
  const dock = useChatDock();
  const { data: session } = authClient.useSession();
  const meId = session?.user?.id ?? null;
  const meta = threadMeta(threadKey, dock.conversations, dock.getChatUser);
  const messages = dock.messagesByThread[threadKey] ?? EMPTY_MESSAGE_LIST;
  const typingSet = dock.typingUsersByThread[threadKey];
  const paging = dock.threadPaging[threadKey];
  const loadingOlder = dock.loadingOlderThread[threadKey] ?? false;

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, threadKey, typingSet?.size]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loadingOlder || !paging?.hasMoreOlder) return;
    if (el.scrollTop < 48) void dock.loadOlderMessages(threadKey);
  }, [dock, loadingOlder, paging?.hasMoreOlder, threadKey]);

  async function submit() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    await dock.sendText(threadKey, text);
    setDraft('');
    setSending(false);
  }

  return (
    <div
      className="flex h-[min(26rem,calc(100dvh-8rem))] w-[min(100vw-2rem,20rem)] shrink-0 flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-lg"
      role="dialog"
      aria-label={`Chat: ${meta.title}`}
    >
      <div className="flex items-center gap-2 border-b border-border px-2 py-2">
        {meta.isGroup ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Users className="h-4 w-4" aria-hidden />
          </div>
        ) : meta.avatarUrl ? (
          <img
            src={meta.avatarUrl}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            {(meta.title[0] || '?').toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{meta.title}</p>
          {meta.subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{meta.subtitle}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => dock.minimizeChat(threadKey)}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Thu nhỏ"
        >
          <Minimize2 className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => dock.closeChat(threadKey)}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3"
      >
        {loadingOlder ? (
          <div className="flex justify-center py-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          </div>
        ) : null}
        {messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Chưa có tin nhắn.</p>
        ) : (
          messages.map((m) => {
            const mine = meId != null && m.senderId === meId;
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
        {typingSet && typingSet.size > 0 ? (
          <p className="text-xs italic text-muted-foreground">Đang nhập…</p>
        ) : null}
      </div>

      <form
        className="flex gap-2 border-t border-border p-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label htmlFor={`dock-draft-${threadKey}`} className="sr-only">
          Nội dung tin nhắn
        </label>
        <input
          id={`dock-draft-${threadKey}`}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            dock.emitTypingDebounced(threadKey);
          }}
          placeholder="Nhập…"
          className="min-h-11 flex-1 rounded-full border border-border bg-muted/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          maxLength={8000}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Gửi"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}

function MessengerChatDockInner() {
  const dock = useChatDock();

  const [a, b] = dock.dock.slots;
  const queue = dock.dock.queue;

  return (
    <>
      <ChatHubPanel
        conversations={dock.conversations}
        onSelectDirect={(id) => dock.openDirectChat(id)}
        onSelectGroup={(gid) => dock.openGroupChat(gid)}
      />

      <ChatUserPickerModal
        open={dock.pickerOpen}
        onClose={() => dock.setPickerOpen(false)}
        onPick={(userId) => dock.openDirectChat(userId)}
      />

      <GroupCreateModal open={dock.groupModalOpen} onClose={() => dock.setGroupModalOpen(false)} />

      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[190] flex flex-row items-end gap-2"
        aria-label="Khay chat"
      >
        <div className="pointer-events-auto flex max-w-[100vw-2rem] flex-row items-end gap-2 overflow-x-auto">
          {queue.map((k) => {
            const m = threadMeta(k, dock.conversations, dock.getChatUser);
            return (
              <button
                key={k}
                type="button"
                onClick={() => dock.promoteFromQueue(k)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold text-foreground shadow-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title={m.title}
                aria-label={`Mở ${m.title}`}
              >
                {(m.title[0] || '?').toUpperCase()}
              </button>
            );
          })}
          {a ? <ChatWindowFrame threadKey={a} /> : null}
          {b ? <ChatWindowFrame threadKey={b} /> : null}
          <button
            type="button"
            onClick={() => dock.toggleHub()}
            className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary shadow-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Tin nhắn"
            aria-expanded={dock.hubOpen}
          >
            <MessageCircle className="h-7 w-7" strokeWidth={2} aria-hidden />
            {dock.unreadChatTotal > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
                {dock.unreadChatTotal > 99 ? '99+' : dock.unreadChatTotal}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </>
  );
}

export function MessengerChatDock() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id ?? null;
  if (!userId) return null;
  return <MessengerChatDockInner />;
}

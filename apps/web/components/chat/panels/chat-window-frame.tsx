'use client';

import { Loader2, Minimize2, Send, Users, X } from 'lucide-react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { useChatDock } from '@/components/chat/dock/chat-dock-context';
import { EMPTY_MESSAGE_LIST, threadMeta } from '@/components/chat/dock/chat-dock.utils';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

type Props = {
  threadKey: string;
};

export function ChatWindowFrame({ threadKey }: Props) {
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

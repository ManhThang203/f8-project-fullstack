'use client';

import { MessageCircle } from 'lucide-react';

import { useChatDock } from '@/components/chat/dock/chat-dock-context';
import { threadMeta } from '@/components/chat/dock/chat-dock.utils';
import { ChatWindowFrame } from '@/components/chat/panels/chat-window-frame';

export function MessengerDockTray() {
  const dock = useChatDock();
  const [slotA, slotB] = dock.dock.slots;
  const queue = dock.dock.queue;

  return (
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
        {slotA ? <ChatWindowFrame threadKey={slotA} /> : null}
        {slotB ? <ChatWindowFrame threadKey={slotB} /> : null}
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
  );
}

'use client';

import { ChevronDown, Plus, Users } from 'lucide-react';
import Link from 'next/link';

import type { Conversation } from '@/components/chat/dock/chat-dock.types';
import { useChatDock } from '@/components/chat/dock/chat-dock-context';
import { peerLabel } from '@/components/chat/dock/chat-dock.utils';
import { cn } from '@/lib/utils';

type Props = {
  conversations: Conversation[];
  onSelectDirect: (peerUserId: string) => void;
  onSelectGroup: (groupId: number) => void;
};

export function ChatHubPanel({ conversations, onSelectDirect, onSelectGroup }: Props) {
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

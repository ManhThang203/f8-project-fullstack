'use client';

import { Loader2, Plus, Users } from 'lucide-react';

import { Avatar } from '@/components/shared/avatar';
import { RelativeTime } from '@/components/shared/relative-time';
import { cn } from '@/lib/utils';
import type { ChatMessageDto, ChatPeerDto, Conversation } from '@/types/chat';

export function peerLabel(p: { name: string | null; username: string }) {
  return p.name?.trim() || `@${p.username}`;
}

// Tóm tắt tin nhắn cuối để hiển thị preview trong sidebar
function lastMessagePreview(msg: ChatMessageDto) {
  if (msg.isUnsent) return 'Tin nhắn đã thu hồi';
  if (msg.type === 'sticker') return '[Nhãn dán]';
  if (msg.mediaId) return '[Hình ảnh/Tệp đính kèm]';
  return msg.content || 'Tin nhắn';
}

export function ConversationList({
  conversations,
  loading,
  activeRoomId,
  onSelect,
  onNewChat,
}: {
  conversations: Conversation[];
  loading: boolean;
  activeRoomId: string | null;
  onSelect: (roomId: string) => void;
  onNewChat: () => void;
}) {
  return (
    <aside
      className={cn(
        'border-border flex w-full flex-col overflow-hidden border-b lg:w-72 lg:border-b-0 lg:border-r lg:pt-0',
        activeRoomId ? 'hidden lg:flex' : 'flex',
      )}
    >
      <div className="border-border flex shrink-0 items-center justify-between gap-2 border-b p-3">
        <h1 className="text-foreground text-sm font-semibold">Hội thoại</h1>
        <button
          type="button"
          onClick={onNewChat}
          className="text-muted-foreground hover:bg-muted focus-visible:ring-ring flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2"
          aria-label="Tin nhắn mới"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-muted-foreground flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
          </div>
        ) : conversations.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">Chưa có hội thoại. Bắt đầu chat mới.</p>
        ) : (
          <ul>
            {conversations.map((c) => {
              const active = activeRoomId === c.id;
              // Không hiện số chưa đọc cho hội thoại đang mở
              const unread = active ? 0 : c.unreadCount;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className={cn(
                      'hover:bg-muted focus-visible:ring-ring flex min-h-11 w-full items-center gap-3 px-3 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2',
                      active && 'bg-muted',
                    )}
                  >
                    {c.isGroup ? (
                      <div className="bg-muted text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                        <Users className="h-5 w-5" aria-hidden />
                      </div>
                    ) : (
                      <div className="relative shrink-0">
                        <Avatar
                          as="span"
                          size="md"
                          src={c.peers[0]?.image}
                          name={c.peers[0]?.name}
                          username={c.peers[0]?.username}
                        />
                        {c.peers[0]?.isOnline ? (
                          <span
                            className="ring-background absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2"
                            aria-hidden
                          />
                        ) : null}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={cn(
                            'text-foreground truncate',
                            unread > 0 ? 'font-semibold' : 'font-medium',
                          )}
                        >
                          {c.isGroup
                            ? c.name || 'Nhóm'
                            : c.peers[0]
                              ? peerLabel(c.peers[0] as ChatPeerDto)
                              : 'Unknown'}
                        </p>
                        {c.lastMessage ? (
                          <RelativeTime
                            dateTime={c.lastMessage.createdAt}
                            className={cn(
                              'shrink-0 text-xs',
                              unread > 0
                                ? 'text-foreground font-semibold'
                                : 'text-muted-foreground',
                            )}
                          />
                        ) : null}
                      </div>
                      <p
                        className={cn(
                          'truncate text-xs',
                          unread > 0 ? 'text-foreground font-medium' : 'text-muted-foreground',
                        )}
                      >
                        {c.lastMessage ? lastMessagePreview(c.lastMessage) : 'Chưa có tin nhắn'}
                      </p>
                    </div>
                    {unread > 0 ? (
                      <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                        {unread}
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
  );
}

'use client';

import { Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useChatDock } from '@/components/chat/chat-dock-context';
import { peerLabel } from '@/components/chat/chat-dock.utils';
import {
  EMPTY_USER_SEARCH,
  useUsersSearch,
} from '@/hooks/queries/use-users-search';
import { useDebounced } from '@/hooks/use-debounced';
import { authClient } from '@/lib/auth-client';

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (userId: string) => void;
};

export function ChatUserPickerModal({ open, onClose, onPick }: Props) {
  const { registerChatUsers } = useChatDock();
  const { data: session } = authClient.useSession();
  const meId = session?.user?.id;
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q, 300);

  const { data, isLoading } = useUsersSearch(debouncedQ, {
    enabled: open,
    excludeUserId: meId,
  });
  const users = data ?? EMPTY_USER_SEARCH;

  useEffect(() => {
    if (open) return;
    setQ('');
  }, [open]);

  useEffect(() => {
    if (!open || users.length === 0) return;
    registerChatUsers(users);
  }, [open, users, registerChatUsers]);

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
          {isLoading ? (
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

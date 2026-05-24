'use client';

import { Loader2, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

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
};

export function GroupCreateModal({ open, onClose }: Props) {
  const { registerChatUsers, createGroup } = useChatDock();
  const { data: session } = authClient.useSession();
  const meId = session?.user?.id;
  const [name, setName] = useState('');
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q, 300);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading: loadingUsers } = useUsersSearch(debouncedQ, {
    enabled: open,
    excludeUserId: meId,
  });
  const users = data ?? EMPTY_USER_SEARCH;

  useEffect(() => {
    if (open) return;
    setName('');
    setQ('');
    setPicked(new Set());
  }, [open]);

  useEffect(() => {
    if (!open || users.length === 0) return;
    registerChatUsers(users);
  }, [open, users, registerChatUsers]);

  function handleClose() {
    onClose();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || picked.size === 0 || submitting) return;
    setSubmitting(true);
    try {
      await createGroup({ name: trimmed, memberUserIds: [...picked] });
      handleClose();
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
      onClick={handleClose}
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
            onClick={handleClose}
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

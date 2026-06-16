'use client';

import { Check, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Avatar } from '@/components/shared/avatar';
import { EMPTY_USER_SEARCH, useUsersSearch } from '@/hooks/queries/use-users-search';
import { useDebounced } from '@/hooks/use-debounced';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

type PickedUser = {
  id: string;
  username: string;
  name: string | null;
};

function userLabel(u: { name: string | null; username: string }) {
  return u.name?.trim() || `@${u.username}`;
}

export function NewChatModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (params: { memberUserIds: string[]; isGroup: boolean; name?: string }) => void;
}) {
  const { data: session } = authClient.useSession();
  const meId = session?.user?.id;
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<PickedUser[]>([]);
  const [groupName, setGroupName] = useState('');
  const debouncedQ = useDebounced(q, 300);

  const { data: usersData, isLoading: loading } = useUsersSearch(debouncedQ, {
    enabled: open,
    excludeUserId: meId,
  });
  const users = usersData ?? EMPTY_USER_SEARCH;

  useEffect(() => {
    if (!open) {
      setQ('');
      setSelected([]);
      setGroupName('');
    }
  }, [open]);

  if (!open) return null;

  const isGroup = selected.length >= 2;

  // Thêm/bỏ user khỏi danh sách đã chọn
  const toggleUser = (u: PickedUser) => {
    setSelected((prev) =>
      prev.some((p) => p.id === u.id) ? prev.filter((p) => p.id !== u.id) : [...prev, u],
    );
  };

  // Gửi yêu cầu tạo chat 1-1 hoặc nhóm rồi đóng modal
  const handleCreate = () => {
    if (selected.length === 0) return;
    onCreate({
      memberUserIds: selected.map((u) => u.id),
      isGroup,
      name: isGroup ? groupName.trim() || undefined : undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 p-4 pt-24 backdrop-blur-sm supports-[backdrop-filter]:bg-black/30 sm:pt-28"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="border-border bg-card flex max-h-[min(80dvh,36rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border shadow-lg"
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

        {selected.length > 0 ? (
          <div className="border-border flex flex-wrap gap-2 border-b px-3 py-2">
            {selected.map((u) => (
              <span
                key={u.id}
                className="bg-muted text-foreground inline-flex items-center gap-1 rounded-full py-1 pl-3 pr-1 text-xs font-medium"
              >
                {userLabel(u)}
                <button
                  type="button"
                  onClick={() => toggleUser(u)}
                  className="text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-ring flex h-6 w-6 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2"
                  aria-label={`Bỏ chọn ${userLabel(u)}`}
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        {isGroup ? (
          <div className="border-border border-b px-3 py-2">
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Tên nhóm (tuỳ chọn)"
              maxLength={191}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring h-10 w-full rounded-lg border px-3 text-sm focus-visible:outline-none focus-visible:ring-2"
            />
          </div>
        ) : null}

        <div className="border-border border-b px-3 py-2">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên hoặc @username…"
            className="border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring h-10 w-full rounded-lg border px-3 text-sm focus-visible:outline-none focus-visible:ring-2"
            autoFocus
          />
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {loading ? (
            <li className="text-muted-foreground flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            </li>
          ) : users.length === 0 ? (
            <li className="text-muted-foreground px-3 py-6 text-center text-sm">
              Không có người dùng phù hợp.
            </li>
          ) : (
            users.map((u) => {
              const checked = selected.some((p) => p.id === u.id);
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    className={cn(
                      'hover:bg-muted focus-visible:ring-ring flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2',
                      checked && 'bg-muted',
                    )}
                    onClick={() => toggleUser(u)}
                    aria-pressed={checked}
                  >
                    <Avatar
                      as="span"
                      size="md"
                      src={u.image}
                      name={u.name}
                      username={u.username}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate font-medium">{userLabel(u)}</p>
                      <p className="text-muted-foreground truncate text-xs">@{u.username}</p>
                    </div>
                    {checked ? <Check className="text-primary h-4 w-4 shrink-0" aria-hidden /> : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <div className="border-border border-t p-3">
          <button
            type="button"
            onClick={handleCreate}
            disabled={selected.length === 0}
            className="bg-primary text-primary-foreground focus-visible:ring-ring flex min-h-11 w-full items-center justify-center rounded-full text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 disabled:opacity-40"
          >
            {isGroup ? `Tạo nhóm (${selected.length + 1} người)` : 'Bắt đầu chat'}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { Check, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Avatar } from '@/components/shared/avatar';
import { Modal } from '@/components/shared/modal';
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
    <Modal open={open} onClose={onClose}>
      <Modal.Backdrop />
      <Modal.Panel
        size="md"
        className="flex max-h-[min(80dvh,36rem)] max-w-md flex-col rounded-2xl"
      >
        <Modal.Header title="Tin nhắn mới" />

        {selected.length > 0 ? (
          <div className="border-border max-h-36 shrink-0 overflow-y-auto overscroll-contain border-b px-3 py-2">
            <div className="flex flex-wrap gap-2">
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

        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
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
      </Modal.Panel>
    </Modal>
  );
}

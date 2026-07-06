'use client';

import Link from 'next/link';
import { toast } from 'sonner';

import { Avatar } from '@/components/shared/avatar';
import { Button } from '@/components/shared/button';
import { SettingsSection } from '@/components/settings/settings-section';
import {
  settingsGhostButtonClass,
  settingsSecondaryButtonClass,
} from '@/components/settings/settings-input-class';
import { useBlockMutation } from '@/hooks/queries/use-block-mutation';
import { useBlockedUsers } from '@/hooks/queries/use-blocked-users';
import { cn } from '@/lib/utils';

/** Danh sách user đã chặn và nút bỏ chặn. */
export function BlockedSettingsSection() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useBlockedUsers();
  const blockMutation = useBlockMutation();

  const items = data?.pages.flatMap((page) => page.items) ?? [];
  // Hàm xử lý bỏ chặn user
  function handleUnblock(userId: string) {
    blockMutation.mutate(
      { userId, block: false },
      {
        onSuccess: () => toast.success('Đã bỏ chặn'),
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <SettingsSection
      title="Người dùng đã chặn"
      description="Những người này không thể tương tác với bạn qua follow, nhắn tin hoặc tìm kiếm."
    >
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Đang tải…</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Bạn chưa chặn ai.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((user) => (
            <li
              key={user.id}
              className="border-border flex items-center gap-3 rounded-xl border p-3"
            >
              <Link
                href={`/${encodeURIComponent(user.username)}`}
                className="focus-visible:ring-ring min-w-0 flex-1 rounded-lg focus-visible:outline-none focus-visible:ring-2"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    as="span"
                    src={user.image}
                    name={user.name}
                    username={user.username}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-medium">
                      {user.name || user.username}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">@{user.username}</p>
                  </div>
                </div>
              </Link>
              <Button
                variant="secondary"
                size="sm"
                className={settingsSecondaryButtonClass}
                loading={
                  blockMutation.isPending && blockMutation.variables?.userId === user.id
                }
                onClick={() => handleUnblock(user.id)}
              >
                Bỏ chặn
              </Button>
            </li>
          ))}
        </ul>
      )}

      {hasNextPage ? (
        <Button
          variant="ghost"
          size="md"
          className={cn(settingsGhostButtonClass, 'mt-4')}
          loading={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
        >
          Tải thêm
        </Button>
      ) : null}
    </SettingsSection>
  );
}

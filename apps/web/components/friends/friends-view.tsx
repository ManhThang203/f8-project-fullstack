'use client';

import type { FriendUserDto } from '@costy/shared';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { toast } from 'sonner';

import { Avatar, Button } from '@/components/shared/ui';
import {
  flattenFriendPages,
  useFriendMutation,
  useFriendRequests,
  useFriendsList,
  type FriendAction,
} from '@/hooks/queries/social';
import { getUserFacingErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

type FriendTab = 'friends' | 'incoming' | 'outgoing';

const TABS: { id: FriendTab; label: string }[] = [
  { id: 'friends', label: 'Bạn bè' },
  { id: 'incoming', label: 'Lời mời đến' },
  { id: 'outgoing', label: 'Đã gửi' },
];

type FriendRowProps = {
  user: FriendUserDto;
  tab: FriendTab;
  pendingUserId: string | null;
  pendingAction: FriendAction | null;
  onAction: (user: FriendUserDto, action: FriendAction) => void;
};

function FriendSkeleton() {
  return (
    <div className="space-y-3" aria-label="Đang tải danh sách bạn bè">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="border-border bg-card flex items-center gap-3 rounded-xl border p-3">
          <div className="bg-muted h-10 w-10 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="bg-muted h-4 w-32 rounded" />
            <div className="bg-muted h-3 w-24 rounded" />
          </div>
          <div className="bg-muted h-9 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function FriendRow({ user, tab, pendingUserId, pendingAction, onAction }: FriendRowProps) {
  const isRowPending = pendingUserId === user.id;

  return (
    <div className="border-border bg-card flex items-center gap-3 rounded-xl border p-3">
      <Link
        href={`/${encodeURIComponent(user.username)}`}
        className="rounded-full focus-visible:ring-ring focus-visible:outline-hidden focus-visible:ring-2"
        aria-label={`Xem trang cá nhân của ${user.name ?? user.username}`}
      >
        <Avatar as="span" src={user.image} name={user.name} username={user.username} size="md" />
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={`/${encodeURIComponent(user.username)}`}
          className="text-foreground block truncate text-sm font-semibold hover:underline focus-visible:outline-hidden focus-visible:underline"
        >
          {user.name ?? user.username}
        </Link>
        <p className="text-muted-foreground truncate text-sm">@{user.username}</p>
      </div>

      {tab === 'friends' ? (
        <Button
          variant="secondary"
          size="sm"
          loading={isRowPending && pendingAction === 'unfriend'}
          disabled={isRowPending}
          onClick={() => onAction(user, 'unfriend')}
        >
          Hủy bạn
        </Button>
      ) : null}

      {tab === 'incoming' ? (
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            loading={isRowPending && pendingAction === 'accept'}
            disabled={isRowPending}
            onClick={() => onAction(user, 'accept')}
          >
            Chấp nhận
          </Button>
          <Button
            variant="secondary"
            size="sm"
            loading={isRowPending && pendingAction === 'reject'}
            disabled={isRowPending}
            onClick={() => onAction(user, 'reject')}
          >
            Từ chối
          </Button>
        </div>
      ) : null}

      {tab === 'outgoing' ? (
        <Button
          variant="secondary"
          size="sm"
          loading={isRowPending && pendingAction === 'cancel'}
          disabled={isRowPending}
          onClick={() => onAction(user, 'cancel')}
        >
          Hủy lời mời
        </Button>
      ) : null}
    </div>
  );
}

/** Màn hình quản lý danh sách bạn bè và lời mời kết bạn của viewer. */
export function FriendsView() {
  const [tab, setTab] = useState<FriendTab>('friends');
  const [search, setSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionLoadingType, setActionLoadingType] = useState<FriendAction | null>(null);

  const friendsQuery = useFriendsList(search, { enabled: tab === 'friends' });
  const incomingQuery = useFriendRequests('incoming', { enabled: tab === 'incoming' });
  const outgoingQuery = useFriendRequests('outgoing', { enabled: tab === 'outgoing' });
  const friendMutation = useFriendMutation({
    onError: (error) => toast.error(getUserFacingErrorMessage(error)),
  });

  const items = useMemo(() => {
    if (tab === 'friends') return flattenFriendPages(friendsQuery.data?.pages);
    if (tab === 'incoming') return flattenFriendPages(incomingQuery.data?.pages);
    return flattenFriendPages(outgoingQuery.data?.pages);
  }, [friendsQuery.data?.pages, incomingQuery.data?.pages, outgoingQuery.data?.pages, tab]);

  const isLoading =
    tab === 'friends'
      ? friendsQuery.isLoading
      : tab === 'incoming'
        ? incomingQuery.isLoading
        : outgoingQuery.isLoading;

  const hasNextPage =
    tab === 'friends'
      ? friendsQuery.hasNextPage
      : tab === 'incoming'
        ? incomingQuery.hasNextPage
        : outgoingQuery.hasNextPage;

  const isFetchingNextPage =
    tab === 'friends'
      ? friendsQuery.isFetchingNextPage
      : tab === 'incoming'
        ? incomingQuery.isFetchingNextPage
        : outgoingQuery.isFetchingNextPage;

  const fetchMore = useCallback(() => {
    if (tab === 'friends') {
      void friendsQuery.fetchNextPage();
      return;
    }
    if (tab === 'incoming') {
      void incomingQuery.fetchNextPage();
      return;
    }
    void outgoingQuery.fetchNextPage();
  }, [tab, friendsQuery, incomingQuery, outgoingQuery]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchMore();
  }, [hasNextPage, isFetchingNextPage, fetchMore]);

  /** Thực hiện thao tác kết bạn từ từng dòng và hiển thị kết quả ngắn gọn. */
  const handleAction = useCallback(
    (user: FriendUserDto, action: FriendAction) => {
      setActionLoadingId(user.id);
      setActionLoadingType(action);
      friendMutation.mutate(
        { userId: user.id, action, user },
        {
          onSuccess: () => {
            const message =
              action === 'accept'
                ? 'Đã chấp nhận lời mời'
                : action === 'reject'
                  ? 'Đã từ chối lời mời'
                  : action === 'cancel'
                    ? 'Đã hủy lời mời'
                    : 'Đã hủy kết bạn';
            toast.success(message);
          },
          onSettled: () => {
            setActionLoadingId(null);
            setActionLoadingType(null);
          },
        },
      );
    },
    [friendMutation],
  );

  const listKey = tab === 'friends' ? `friends-${search}` : tab;

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4">
      <div>
        <h1 className="text-foreground text-xl font-semibold">Bạn bè</h1>
        <p className="text-muted-foreground mt-1 text-sm">Quản lý bạn bè và lời mời kết bạn.</p>
      </div>

      <div className="border-border bg-card rounded-2xl border p-2">
        <div className="grid grid-cols-3 gap-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={tab === item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                'min-h-11 rounded-xl px-3 text-sm font-medium transition-colors duration-150',
                'focus-visible:ring-ring focus-visible:outline-hidden focus-visible:ring-2',
                tab === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'friends' ? (
        <label className="sr-only" htmlFor="friends-search">
          Tìm bạn bè
        </label>
      ) : null}
      {tab === 'friends' ? (
        <input
          id="friends-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm bạn bè"
          className="border-border bg-card text-foreground placeholder:text-muted-foreground min-h-11 rounded-xl border px-4 text-sm focus-visible:ring-ring focus-visible:outline-hidden focus-visible:ring-2"
        />
      ) : null}

      {isLoading ? (
        <FriendSkeleton />
      ) : items.length > 0 ? (
        <Virtuoso
          key={listKey}
          useWindowScroll
          data={items}
          computeItemKey={(_, user) => user.id}
          endReached={handleEndReached}
          overscan={400}
          components={{
            Footer: () => (
              <div className="flex min-h-11 items-center justify-center py-4">
                {isFetchingNextPage ? (
                  <p className="text-muted-foreground text-sm" aria-live="polite">
                    Đang tải thêm…
                  </p>
                ) : null}
              </div>
            ),
          }}
          itemContent={(_, user) => (
            <div className="pb-3">
              <FriendRow
                user={user}
                tab={tab}
                pendingUserId={actionLoadingId}
                pendingAction={actionLoadingType}
                onAction={handleAction}
              />
            </div>
          )}
        />
      ) : (
        <div className="border-border bg-card rounded-2xl border px-4 py-8 text-center">
          <p className="text-foreground text-sm font-medium">Chưa có dữ liệu</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {tab === 'friends'
              ? 'Danh sách bạn bè sẽ xuất hiện tại đây.'
              : 'Lời mời kết bạn sẽ xuất hiện tại đây.'}
          </p>
        </div>
      )}
    </section>
  );
}

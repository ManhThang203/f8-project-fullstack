'use client';

import type { UserSummaryDto } from '@costy/shared';
import { X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Avatar } from '@/components/shared/avatar';
import { Button } from '@/components/shared/button';
import {
  flattenFollowListPages,
  useFollowList,
} from '@/hooks/queries/use-follow-list';
import { useFollowMutation } from '@/hooks/queries/use-follow-mutation';
import { useDebounced } from '@/hooks/use-debounced';
import { cn } from '@/lib/utils';

type Props = {
  username: string;
  title: string;
  mode: 'followers' | 'following';
  onClose?: () => void;
  asModal?: boolean;
};

export function FollowListView({ username, title, mode, onClose, asModal }: Props) {
  const [query, setQuery] = useState('');
  const [followLoadingId, setFollowLoadingId] = useState<string | null>(null);
  const [optimisticFollow, setOptimisticFollow] = useState<Record<string, boolean>>({});
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const debouncedQ = useDebounced(query, 300);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFollowList(username, mode, debouncedQ);

  const followMutation = useFollowMutation({
    onError: (err) => toast.error(err.message),
  });

  const baseItems = flattenFollowListPages(data?.pages);
  const items: UserSummaryDto[] = baseItems.map((u) =>
    u.id in optimisticFollow ? { ...u, isFollowing: optimisticFollow[u.id]! } : u,
  );

  useEffect(() => {
    if (isError) toast.error(error.message);
  }, [isError, error]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void fetchNextPage();
      },
      { rootMargin: '120px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  function toggleFollow(user: UserSummaryDto) {
    const next = !user.isFollowing;
    setOptimisticFollow((prev) => ({ ...prev, [user.id]: next }));
    setFollowLoadingId(user.id);

    followMutation.mutate(
      { userId: user.id, follow: next },
      {
        onSuccess: (data) => {
          setOptimisticFollow((prev) => ({ ...prev, [user.id]: data.isFollowing }));
        },
        onError: () => {
          setOptimisticFollow((prev) => {
            const copy = { ...prev };
            delete copy[user.id];
            return copy;
          });
        },
        onSettled: () => setFollowLoadingId(null),
      },
    );
  }

  const shellClass = cn(
    asModal
      ? 'flex min-h-0 w-full flex-1 flex-col overflow-hidden'
      : 'mx-auto w-full max-w-[600px]',
  );

  return (
    <div className={shellClass}>
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <h1 className="text-foreground text-base font-semibold">{title}</h1>
        {onClose ? (
          <Button variant="ghost" size="icon-md" aria-label="Đóng" onClick={onClose}>
            <X className="h-5 w-5" aria-hidden />
          </Button>
        ) : (
          <Link
            href={`/${encodeURIComponent(username)}`}
            className="text-muted-foreground text-sm hover:underline"
          >
            Về trang cá nhân
          </Link>
        )}
      </div>

      <div className="border-border border-b px-4 py-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm kiếm"
          aria-label="Tìm kiếm người dùng"
          className="bg-muted text-foreground placeholder:text-muted-foreground w-full rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <ul className="flex-1 overflow-y-auto">
        {isLoading ? (
          <li className="text-muted-foreground px-4 py-8 text-center text-sm">Đang tải…</li>
        ) : items.length === 0 ? (
          <li className="text-muted-foreground px-4 py-8 text-center text-sm">Không có kết quả</li>
        ) : (
          items.map((user) => (
            <li key={user.id} className="flex items-center gap-3 px-4 py-3">
              <Link href={`/${encodeURIComponent(user.username)}`} className="shrink-0">
                <Avatar
                  src={user.image}
                  name={user.name}
                  username={user.username}
                  size="md"
                  tabIndex={-1}
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/${encodeURIComponent(user.username)}`}
                  className="text-foreground block truncate text-sm font-semibold hover:underline"
                >
                  {user.name ?? user.username}
                </Link>
                <p className="text-muted-foreground truncate text-xs">@{user.username}</p>
              </div>
              <Button
                variant={user.isFollowing ? 'secondary' : 'primary'}
                size="sm"
                loading={followLoadingId === user.id}
                onClick={() => toggleFollow(user)}
              >
                {user.isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
              </Button>
            </li>
          ))
        )}
      </ul>
      {isFetchingNextPage ? (
        <div className="flex justify-center py-4">
          <span className="border-muted-foreground h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      ) : null}
      <div ref={loadMoreRef} className="h-1" aria-hidden />
    </div>
  );
}

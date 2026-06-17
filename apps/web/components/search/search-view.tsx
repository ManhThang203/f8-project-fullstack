'use client';

import type { HashtagSearchResultDto, UserSearchResultDto } from '@costy/shared';
import { Hash, Search, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { PostCard } from '@/components/home/post/post-card';
import { Avatar } from '@/components/shared/avatar';
import { Button } from '@/components/shared/button';
import {
  useSearchHashtags,
  useSearchPosts,
  useSearchUsers,
} from '@/hooks/queries/use-search-queries';
import { cn } from '@/lib/utils';

type SearchTab = 'posts' | 'users' | 'hashtags';

const TABS: { id: SearchTab; label: string; icon: typeof Search }[] = [
  { id: 'posts', label: 'Bài viết', icon: Search },
  { id: 'users', label: 'Người dùng', icon: User },
  { id: 'hashtags', label: 'Hashtag', icon: Hash },
];

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'min-h-11 flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}

function UserResultRow({ user }: { user: UserSearchResultDto }) {
  return (
    <Link
      href={`/${user.username}`}
      className="hover:bg-muted flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 transition-colors"
    >
      <Avatar
        as="span"
        src={user.image}
        name={user.name}
        username={user.username}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{user.name ?? user.username}</p>
        <p className="text-muted-foreground truncate text-xs">@{user.username}</p>
      </div>
      {user.isFollowing ? (
        <span className="text-muted-foreground text-xs">Đang theo dõi</span>
      ) : null}
    </Link>
  );
}

function HashtagResultRow({ tag }: { tag: HashtagSearchResultDto }) {
  return (
    <Link
      href={`/search?q=${encodeURIComponent('#' + tag.tag)}`}
      className="hover:bg-muted flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors"
    >
      <span className="text-sm font-semibold">#{tag.tag}</span>
      <span className="text-muted-foreground text-xs">{tag.postCount} bài</span>
    </Link>
  );
}

/** Màn hình tìm kiếm với tabs bài viết / người dùng / hashtag. */
export function SearchView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qParam = searchParams.get('q') ?? '';
  const [input, setInput] = useState(qParam);
  const [tab, setTab] = useState<SearchTab>('posts');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInput(qParam);
  }, [qParam]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimmed = qParam.trim();
  const canSearch = trimmed.length >= 2;

  const postsQuery = useSearchPosts(trimmed, tab === 'posts');
  const usersQuery = useSearchUsers(trimmed, tab === 'users');
  const hashtagsQuery = useSearchHashtags(trimmed, tab === 'hashtags');

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const next = input.trim();
    if (next.length < 2) return;
    router.push(`/search?q=${encodeURIComponent(next)}`);
  }

  const isLoading =
    (tab === 'posts' && postsQuery.isLoading) ||
    (tab === 'users' && usersQuery.isLoading) ||
    (tab === 'hashtags' && hashtagsQuery.isLoading);

  const isError =
    (tab === 'posts' && postsQuery.isError) ||
    (tab === 'users' && usersQuery.isError) ||
    (tab === 'hashtags' && hashtagsQuery.isError);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4">
      <form role="search" onSubmit={submitSearch} className="mb-4">
        <label htmlFor="search-page-input" className="sr-only">
          Tìm kiếm
        </label>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            id="search-page-input"
            name="q"
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tìm kiếm…"
            autoComplete="off"
            className="border-border bg-muted/60 text-foreground placeholder:text-muted-foreground focus-visible:bg-background focus-visible:ring-ring h-11 min-w-0 flex-1 rounded-full border px-4 text-sm transition-[box-shadow,background-color] focus-visible:outline-none focus-visible:ring-2"
          />
          <Button type="submit" size="md" disabled={input.trim().length < 2}>
            Tìm
          </Button>
        </div>
      </form>

      <div className="border-border mb-4 flex gap-1 rounded-xl border p-1">
        {TABS.map((t) => (
          <TabButton key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </TabButton>
        ))}
      </div>

      {!canSearch ? (
        <p className="text-muted-foreground text-sm">Nhập ít nhất 2 ký tự để tìm kiếm.</p>
      ) : isLoading ? (
        <p className="text-muted-foreground text-sm" aria-live="polite">
          Đang tìm…
        </p>
      ) : isError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          Không tải được kết quả. Thử lại sau.
        </p>
      ) : tab === 'posts' ? (
        postsQuery.data && postsQuery.data.length > 0 ? (
          <ul className="flex flex-col">
            {postsQuery.data.map((post) => (
              <PostCard key={post.id} post={post} onDismiss={() => {}} hideDismiss />
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">Không có bài viết phù hợp.</p>
        )
      ) : tab === 'users' ? (
        usersQuery.data && usersQuery.data.length > 0 ? (
          <div className="flex flex-col gap-1">
            {usersQuery.data.map((user) => (
              <UserResultRow key={user.id} user={user} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Không tìm thấy người dùng.</p>
        )
      ) : hashtagsQuery.data && hashtagsQuery.data.length > 0 ? (
        <div className="flex flex-col gap-1">
          {hashtagsQuery.data.map((tag) => (
            <HashtagResultRow key={tag.id} tag={tag} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Không tìm thấy hashtag.</p>
      )}
    </div>
  );
}

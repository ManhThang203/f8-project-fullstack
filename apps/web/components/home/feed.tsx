'use client';

import type { PostFeedItemDto, PostFeedMeta } from '@threads/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CreatePostModal } from './create-post-modal';
import { CreatePostTrigger } from './create-post-trigger';
import { PostCard } from './post-card';
import { apiFetch } from '@/lib/api-client';
import { authClient } from '@/lib/auth-client';
import type { ServerAuthUser } from '@/lib/auth-user.types';

import { cn } from '@/lib/utils';

type FeedUser = {
  id: string;
  email: string | null;
  username: string;
  name: string | null;
  image?: string | null;
};

function userFromServer(u: ServerAuthUser): FeedUser {
  return {
    id: u.id,
    email: u.email,
    username: u.username ?? '',
    name: u.name,
  };
}

type Props = {
  initialUser: ServerAuthUser | null;
};

export function HomeFeed({ initialUser }: Props) {
  const { data: session } = authClient.useSession();

  const me = useMemo<FeedUser | null>(() => {
    const fromClient = session?.user
      ? {
          id: session.user.id,
          email: session.user.email ?? null,
          username: (session.user as { username?: string | null }).username ?? '',
          name: session.user.name ?? null,
          image: (session.user as { image?: string | null }).image ?? null,
        }
      : null;
    const fromServer = initialUser ? userFromServer(initialUser) : null;
    return fromClient ?? fromServer ?? null;
  }, [session?.user, initialUser]);

  const [posts, setPosts] = useState<PostFeedItemDto[]>([]);

  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const [loadingMore, setLoadingMore] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());

  const loadMoreRef = useRef<HTMLDivElement>(null);

  const [modalOpen, setModalOpen] = useState(false);

  const [autoOpenFilePicker, setAutoOpenFilePicker] = useState(false);

  const visiblePosts = useMemo(
    () => posts.filter((p) => !dismissedIds.has(p.id)),

    [posts, dismissedIds],
  );

  const dismissPost = useCallback((postId: string) => {
    setDismissedIds((prev) => new Set(prev).add(postId));
  }, []);

  const fetchPage = useCallback(async (cursor?: string) => {
    const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';

    return apiFetch<PostFeedItemDto[], PostFeedMeta>(`/posts${qs}`);
  }, []);

  const loadInitial = useCallback(async () => {
    setError(null);

    const res = await fetchPage();

    if (!res.success) {
      setError(res.error.message);

      setPosts([]);

      setNextCursor(null);

      return;
    }

    setPosts(res.data);

    setNextCursor(res.meta?.nextCursor ?? null);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore || loading) return;

    setLoadingMore(true);

    setError(null);

    const res = await fetchPage(nextCursor);

    setLoadingMore(false);

    if (!res.success) {
      setError(res.error.message);

      return;
    }

    setPosts((prev) => [...prev, ...res.data]);

    setNextCursor(res.meta?.nextCursor ?? null);
  }, [fetchPage, nextCursor, loadingMore, loading]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      await loadInitial();

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [loadInitial]);

  useEffect(() => {
    const el = loadMoreRef.current;

    if (!el || !nextCursor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },

      { rootMargin: '200px' },
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [loadMore, nextCursor]);

  function openModal(openFilePicker = false) {
    setAutoOpenFilePicker(openFilePicker);

    setModalOpen(true);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-4 py-4">
      <div className="mb-8">
        <CreatePostTrigger
          username={me?.username ?? me?.name ?? undefined}
          avatarUrl={me?.image ?? undefined}
          onOpen={openModal}
        />
      </div>

      <CreatePostModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        autoOpenFilePicker={autoOpenFilePicker}
        username={me?.username ?? undefined}
        name={me?.name ?? undefined}
        avatarUrl={me?.image ?? undefined}
        onPosted={(post) => {
          setPosts((prev) => [post, ...prev]);
        }}
      />

      {error ? (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <section aria-busy={loading}>
        {loading ? (
          <p className="text-muted-foreground text-sm">Đang tải feed…</p>
        ) : visiblePosts.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {posts.length > 0
              ? 'Không còn bài hiển thị. Tải lại trang để xem lại feed.'
              : 'Chưa có bài đăng. Hãy chạy seed hoặc viết bài mới.'}
          </p>
        ) : (
          <>
            <ul className="flex flex-col">
              {visiblePosts.map((post) => (
                <PostCard key={post.id} post={post} onDismiss={dismissPost} />
              ))}
            </ul>

            <div ref={loadMoreRef} className="flex min-h-11 items-center justify-center py-4">
              {loadingMore ? (
                <p className="text-muted-foreground text-sm" aria-live="polite">
                  Đang tải thêm…
                </p>
              ) : nextCursor ? (
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  className={cn(
                    'text-primary min-h-11 px-4 text-sm font-medium',

                    'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
                  )}
                >
                  Tải thêm bài viết
                </button>
              ) : (
                <p className="text-muted-foreground text-xs">Đã hiển thị tất cả bài trong feed.</p>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

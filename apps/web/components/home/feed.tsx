'use client';

import type { PostFeedItemDto } from '@threads/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CreatePostModal } from './create-post-modal';
import { CreatePostTrigger } from './create-post-trigger';
import { FeedSkeletonList } from './feed-skeleton-list';
import { PostCard } from './post-card';
import { flattenPostsFeedPages, usePostsFeed } from '@/hooks/queries/use-posts-feed';
import { authClient } from '@/lib/auth-client';
import type { ServerAuthUser } from '@/lib/auth-user.types';
import { queryKeys } from '@/lib/query-keys';

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
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();

  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    usePostsFeed();

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

  const posts = useMemo(() => flattenPostsFeedPages(data?.pages), [data?.pages]);

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

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void fetchNextPage();
      },
      { rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  function openModal(openFilePicker = false) {
    setAutoOpenFilePicker(openFilePicker);
    setModalOpen(true);
  }

  function handlePosted(post: PostFeedItemDto) {
    queryClient.setQueryData(queryKeys.posts.feed, (old: typeof data) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page, i) =>
          i === 0 ? { ...page, data: [post, ...page.data] } : page,
        ),
      };
    });
  }

  const errorMessage = isError ? error.message : null;

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
        onPosted={handlePosted}
      />

      {errorMessage ? (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <section aria-busy={isLoading}>
        {isLoading ? (
          <FeedSkeletonList />
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
              {isFetchingNextPage ? (
                <p className="text-muted-foreground text-sm" aria-live="polite">
                  Đang tải thêm…
                </p>
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

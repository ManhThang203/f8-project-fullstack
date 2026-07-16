'use client';

import type { PostFeedItemDto } from '@costy/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import type { Socket } from 'socket.io-client';
import { toast } from 'sonner';

import { CreatePostModal } from '../compose/create-post-modal';
import { CreatePostTrigger } from '../compose/create-post-trigger';

import { FeedSkeletonList } from './feed-skeleton-list';

import { PostCard } from '@/components/home/post/card';
import { useCurrentUser } from '@/components/shared/providers/current-user-context';
import { Button } from '@/components/shared/ui';
import {
  flattenPostsFeedPages,
  usePostsFeed,
  type FeedScope,
  type FeedSort,
} from '@/hooks/queries/posts';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { getUserFacingErrorMessage } from '@/lib/api';
import type { ServerAuthUser } from '@/lib/auth';
import { onHomeFeedRefresh } from '@/lib/events';
import { queryKeys } from '@/lib/query';
import { getAuthedSocket } from '@/lib/socket';
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
    image: u.image,
  };
}

type Props = {
  initialUser: ServerAuthUser | null;
};

function FeedToggleButton({
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
        'min-h-9 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
        'focus-visible:ring-ring focus-visible:outline-hidden focus-visible:ring-2',
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}

export function HomeFeed({ initialUser }: Props) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useCurrentUser();
  const { requireAuth } = useRequireAuth();

  const [sort, setSort] = useState<FeedSort>('recent');
  const [scope, setScope] = useState<FeedScope>('all');
  const feedKey = useMemo(() => [...queryKeys.posts.feed, sort, scope], [sort, scope]);

  const { data, isLoading, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    usePostsFeed({ sort, scope });

  const me = useMemo<FeedUser | null>(() => {
    if (currentUser) {
      return {
        id: currentUser.id,
        email: currentUser.email,
        username: currentUser.username ?? '',
        name: currentUser.name,
        image: currentUser.image,
      };
    }
    return initialUser ? userFromServer(initialUser) : null;
  }, [currentUser, initialUser]);

  const posts = useMemo(() => flattenPostsFeedPages(data?.pages), [data?.pages]);

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [autoOpenFilePicker, setAutoOpenFilePicker] = useState(false);

  const visiblePosts = useMemo(
    () => posts.filter((p) => !dismissedIds.has(p.id)),
    [posts, dismissedIds],
  );

  const dismissPost = useCallback((postId: string) => {
    setDismissedIds((prev) => new Set(prev).add(postId));
  }, []);

  /** Tải trang tiếp theo khi cuộn tới cuối danh sách Virtuoso. */
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Khi bấm Home/logo lúc đang ở trang chủ: cuộn lên đầu và tải lại feed mới.
  useEffect(
    () =>
      onHomeFeedRefresh(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setDismissedIds(new Set());
        void queryClient.resetQueries({ queryKey: queryKeys.posts.feed });
      }),
    [queryClient],
  );

  function openModal(openFilePicker = false) {
    if (!requireAuth()) return;
    setAutoOpenFilePicker(openFilePicker);
    setModalOpen(true);
  }

  // Đồng bộ bài vừa đăng vào cache feed, tránh trùng với sự kiện realtime cùng post.
  function handlePosted(post: PostFeedItemDto) {
    queryClient.setQueryData(feedKey, (old: typeof data) => {
      if (!old) return old;
      const exists = old.pages.some((page) => page.data.some((p) => p.id === post.id));
      if (exists) return old;
      return {
        ...old,
        pages: old.pages.map((page, i) =>
          i === 0 ? { ...page, data: [post, ...page.data] } : page,
        ),
      };
    });
  }

  useEffect(() => {
    if (!me?.id) return;

    let cancelled = false;
    let activeSocket: Socket | null = null;

    function onPostCreated(post: PostFeedItemDto) {
      queryClient.setQueriesData<typeof data>({ queryKey: queryKeys.posts.feed }, (old) => {
        if (!old) return old;
        const exists = old.pages.some((page) => page.data.some((p) => p.id === post.id));
        if (exists) return old;
        return {
          ...old,
          pages: old.pages.map((page, i) =>
            i === 0 ? { ...page, data: [post, ...page.data] } : page,
          ),
        };
      });
    }

    function onPostReacted(payload: { postId: string; likeCount: number }) {
      queryClient.setQueriesData<typeof data>({ queryKey: queryKeys.posts.feed }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.map((p) =>
              p.id === payload.postId ? { ...p, likeCount: payload.likeCount } : p,
            ),
          })),
        };
      });
    }

    function onCommentCountChanged(payload: { postId: string; delta: number; actorId: string }) {
      if (me?.id && payload.actorId === me.id) return;
      queryClient.setQueriesData<typeof data>({ queryKey: queryKeys.posts.feed }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.map((p) =>
              p.id === payload.postId
                ? {
                    ...p,
                    replyCount: Math.max(0, p.replyCount + payload.delta),
                    commentCount: Math.max(0, (p.commentCount ?? p.replyCount) + payload.delta),
                  }
                : p,
            ),
          })),
        };
      });
    }

    function onPostHidden(payload: { postId: string; parentId?: string | null }) {
      if (payload.parentId) return;
      queryClient.setQueriesData<typeof data>({ queryKey: queryKeys.posts.feed }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.filter((p) => p.id !== payload.postId),
          })),
        };
      });
      dismissPost(payload.postId);
      queryClient.invalidateQueries({ queryKey: ['posts', 'comments'] });
    }

    void getAuthedSocket('/feed')
      .then((socket) => {
        if (cancelled) return;
        activeSocket = socket;
        socket.on('post:created', onPostCreated);
        socket.on('post:reacted', onPostReacted);
        socket.on('post:hidden', onPostHidden);
        socket.on('comment:countChanged', onCommentCountChanged);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (activeSocket) {
        activeSocket.off('post:created', onPostCreated);
        activeSocket.off('post:reacted', onPostReacted);
        activeSocket.off('post:hidden', onPostHidden);
        activeSocket.off('comment:countChanged', onCommentCountChanged);
      }
    };
  }, [queryClient, dismissPost, me?.id]);

  const errorMessage = isError ? getUserFacingErrorMessage(error) : null;

  useEffect(() => {
    if (!errorMessage) return;
    toast.error(errorMessage);
  }, [errorMessage]);

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

      {me ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="border-border flex items-center gap-1 rounded-xl border p-1">
            <FeedToggleButton active={sort === 'recent'} onClick={() => setSort('recent')}>
              Mới nhất
            </FeedToggleButton>
            <FeedToggleButton active={sort === 'top'} onClick={() => setSort('top')}>
              Phổ biến
            </FeedToggleButton>
          </div>
          <div className="border-border flex items-center gap-1 rounded-xl border p-1">
            <FeedToggleButton active={scope === 'all'} onClick={() => setScope('all')}>
              Tất cả
            </FeedToggleButton>
            <FeedToggleButton
              active={scope === 'following'}
              onClick={() => setScope('following')}
            >
              Bạn bè & đang theo dõi
            </FeedToggleButton>
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mb-4 space-y-3 rounded-xl border border-border p-6 text-center" role="alert">
          <p className="text-muted-foreground text-sm">{errorMessage}</p>
          <Button variant="secondary" size="sm" onClick={() => void refetch()}>
            Thử lại
          </Button>
        </div>
      ) : null}

      <section aria-busy={isLoading}>
        {isLoading ? (
          <FeedSkeletonList />
        ) : isError ? null : visiblePosts.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {posts.length > 0
              ? 'Không còn bài hiển thị. Tải lại trang để xem lại bảng tin.'
              : scope === 'following'
                ? 'Chưa có bài từ bạn bè hoặc người bạn theo dõi. Hãy kết bạn hoặc theo dõi thêm nhé.'
                : 'Chưa có bài đăng nào. Hãy viết bài đầu tiên hoặc quay lại sau.'}
          </p>
        ) : (
          <Virtuoso
            useWindowScroll
            data={visiblePosts}
            computeItemKey={(_, post) => post.id}
            endReached={handleEndReached}
            overscan={600}
            itemContent={(_, post) => <PostCard post={post} onDismiss={dismissPost} />}
            components={{
              Footer: () => (
                <div className="flex min-h-11 items-center justify-center py-4">
                  {isFetchingNextPage ? (
                    <p className="text-muted-foreground text-sm" aria-live="polite">
                      Đang tải thêm…
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      Đã hiển thị tất cả bài trong feed.
                    </p>
                  )}
                </div>
              ),
            }}
          />
        )}
      </section>
    </div>
  );
}

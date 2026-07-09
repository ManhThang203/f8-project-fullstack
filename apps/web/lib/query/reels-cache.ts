  import type { ReelsFeedItemDto, ReelsFeedMeta } from '@costy/shared';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';

type ReelsPage = {
  data: ReelsFeedItemDto[];
  meta?: ReelsFeedMeta;
};

type ReelsInfiniteCache = InfiniteData<ReelsPage, string | undefined>;

const REELS_QUERY_KEY_PREFIX = ['posts', 'reels'] as const;

/** Cập nhật một phần dữ liệu reel trong mọi cache infinite query reels (không refetch). */
export function patchReelItemInCache(
  queryClient: QueryClient,
  postId: string,
  patch: Partial<ReelsFeedItemDto>,
): void {
  queryClient.setQueriesData<ReelsInfiniteCache>(
    { queryKey: [...REELS_QUERY_KEY_PREFIX] },
    (old) => {
      if (!old) return old;
      let changed = false;
      const pages = old.pages.map((page) => ({
        ...page,
        data: page.data.map((item) => {
          if (item.id !== postId) return item;
          changed = true;
          return { ...item, ...patch };
        }),
      }));
      return changed ? { ...old, pages } : old;
    },
  );
}

/** Cập nhật trạng thái theo dõi cho mọi reel của một tác giả trong cache (không refetch). */
export function patchReelFollowStateByAuthorInCache(
  queryClient: QueryClient,
  authorId: string,
  isFollowing: boolean,
): void {
  queryClient.setQueriesData<ReelsInfiniteCache>(
    { queryKey: [...REELS_QUERY_KEY_PREFIX] },
    (old) => {
      if (!old) return old;
      let changed = false;
      const pages = old.pages.map((page) => ({
        ...page,
        data: page.data.map((item) => {
          if (item.author.id !== authorId || item.isFollowing === isFollowing) return item;
          changed = true;
          return { ...item, isFollowing };
        }),
      }));
      return changed ? { ...old, pages } : old;
    },
  );
}

/** Gỡ mọi reel của một tác giả khỏi cache reels (dùng khi block user, không refetch). */
export function removeReelItemsByAuthorInCache(
  queryClient: QueryClient,
  authorId: string,
): void {
  queryClient.setQueriesData<ReelsInfiniteCache>(
    { queryKey: [...REELS_QUERY_KEY_PREFIX] },
    (old) => {
      if (!old) return old;
      let changed = false;
      const pages = old.pages.map((page) => {
        const data = page.data.filter((item) => item.author.id !== authorId);
        if (data.length !== page.data.length) changed = true;
        return { ...page, data };
      });
      return changed ? { ...old, pages } : old;
    },
  );
}

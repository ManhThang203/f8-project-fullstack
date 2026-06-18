import type { PostFeedItemDto } from '@costy/shared';
import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';

type FeedCache = {
  pages: { data: PostFeedItemDto[]; meta?: unknown }[];
  pageParams: unknown[];
};

/** Giảm replyCount của bài viết trong cache feed (optimistic sau khi xóa comment). */
export function decrementReplyCountInFeedCache(
  queryClient: QueryClient,
  rootPostId: string,
): void {
  queryClient.setQueriesData<FeedCache>({ queryKey: queryKeys.posts.feed }, (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        data: page.data.map((p) =>
          p.id === rootPostId ? { ...p, replyCount: Math.max(0, p.replyCount - 1) } : p,
        ),
      })),
    };
  });
}

/** Tăng replyCount của bài viết trong cache feed (optimistic sau khi thêm comment). */
export function incrementReplyCountInFeedCache(
  queryClient: QueryClient,
  rootPostId: string,
): void {
  queryClient.setQueriesData<FeedCache>({ queryKey: queryKeys.posts.feed }, (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        data: page.data.map((p) =>
          p.id === rootPostId ? { ...p, replyCount: p.replyCount + 1 } : p,
        ),
      })),
    };
  });
}

/** Cập nhật replyCount của bài viết trong cache feed theo delta (realtime). */
export function applyReplyCountDeltaInFeedCache(
  queryClient: QueryClient,
  rootPostId: string,
  delta: number,
): void {
  queryClient.setQueriesData<FeedCache>({ queryKey: queryKeys.posts.feed }, (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        data: page.data.map((p) =>
          p.id === rootPostId ? { ...p, replyCount: Math.max(0, p.replyCount + delta) } : p,
        ),
      })),
    };
  });
}

type CommentsCache = {
  pages: { items: PostFeedItemDto[]; nextCursor: string | null }[];
  pageParams: unknown[];
};

/** Chèn comment mới vào đầu cache danh sách comment (dedupe theo id). */
export function insertCommentInCache(
  queryClient: QueryClient,
  parentId: string,
  comment: PostFeedItemDto,
): void {
  queryClient.setQueriesData<CommentsCache>(
    { queryKey: ['posts', 'comments', parentId] },
    (old) => {
      if (!old || old.pages.length === 0) {
        return {
          pages: [{ items: [comment], nextCursor: null }],
          pageParams: [undefined],
        };
      }
      const exists = old.pages.some((page) => page.items.some((c) => c.id === comment.id));
      if (exists) return old;
      return {
        ...old,
        pages: old.pages.map((page, i) =>
          i === 0 ? { ...page, items: [comment, ...page.items] } : page,
        ),
      };
    },
  );
}

/** Gỡ comment khỏi cache danh sách comment. */
export function removeCommentFromCache(
  queryClient: QueryClient,
  parentId: string,
  commentId: string,
): void {
  queryClient.setQueriesData<CommentsCache>(
    { queryKey: ['posts', 'comments', parentId] },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.filter((c) => c.id !== commentId),
        })),
      };
    },
  );
}

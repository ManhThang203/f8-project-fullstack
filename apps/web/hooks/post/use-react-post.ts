import type { PostFeedItemDto } from '@costy/shared';
import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { patchTopReactionsOptimistic } from '@/lib/post';

type FeedPage = { data: PostFeedItemDto[] };
type FeedCache = InfiniteData<FeedPage>;
type FlatFeedCache = { data: PostFeedItemDto[] };
type CommentsPage = { items: PostFeedItemDto[]; nextCursor: string | null };
type CommentsCache = InfiniteData<CommentsPage>;

type ReactPostVariables = {
  postId: string;
  type: string | null;
};

type ReactPostResponse = {
  postId: string;
  reactionType: string | null;
  likeCount: number;
};

/** Cập nhật reaction/likeCount cho một post trong danh sách feed. */
function patchPostReaction(
  post: PostFeedItemDto,
  postId: string,
  type: string | null,
): PostFeedItemDto {
  if (post.id !== postId) return post;

  const wasLiked = post.myReaction !== null;
  const isLikedNow = type !== null;
  let newLikeCount = post.likeCount;
  if (!wasLiked && isLikedNow) newLikeCount++;
  if (wasLiked && !isLikedNow) newLikeCount = Math.max(0, newLikeCount - 1);

  return {
    ...post,
    myReaction: type,
    likeCount: newLikeCount,
    topReactions: patchTopReactionsOptimistic(
      post.topReactions ?? [],
      type,
      post.myReaction,
      newLikeCount,
    ),
  };
}

function patchInfiniteFeedCache(
  old: FeedCache,
  postId: string,
  type: string | null,
): FeedCache {
  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      data: page.data.map((p) => patchPostReaction(p, postId, type)),
    })),
  };
}

function patchFlatFeedCache(
  old: FlatFeedCache,
  postId: string,
  type: string | null,
): FlatFeedCache {
  return {
    ...old,
    data: old.data.map((p) => patchPostReaction(p, postId, type)),
  };
}

function patchCommentsCache(
  old: CommentsCache,
  postId: string,
  type: string | null,
): CommentsCache {
  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      items: page.items.map((p) => patchPostReaction(p, postId, type)),
    })),
  };
}

/** Patch mọi cache chứa PostFeedItemDto (feed, trang chi tiết, comments). */
function patchAllCaches(old: unknown, postId: string, type: string | null): unknown {
  if (!old || typeof old !== 'object') return old;

  if ('pages' in old && Array.isArray((old as { pages: unknown[] }).pages)) {
    const firstPage = (old as { pages: Record<string, unknown>[] }).pages[0];
    if (firstPage && 'data' in firstPage) {
      return patchInfiniteFeedCache(old as FeedCache, postId, type);
    }
    if (firstPage && 'items' in firstPage) {
      return patchCommentsCache(old as CommentsCache, postId, type);
    }
    return old;
  }

  if ('data' in old && Array.isArray((old as FlatFeedCache).data)) {
    return patchFlatFeedCache(old as FlatFeedCache, postId, type);
  }

  if ('id' in old && 'likeCount' in old) {
    return patchPostReaction(old as PostFeedItemDto, postId, type);
  }

  return old;
}

const REACT_QUERY_PREFIXES = [
  ['posts'] as const,
  ['users', 'feed'] as const,
  ['me', 'saved'] as const,
  ['search', 'posts'] as const,
];

export function useReactPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, type }: ReactPostVariables) => {
      const res = await apiFetch<ReactPostResponse>(`/posts/${postId}/reactions`, {
        method: 'PUT',
        body: JSON.stringify({ type }),
      });
      if (!res.success) {
        throw new Error(res.error.message);
      }
      return res.data;
    },
    onMutate: async ({ postId, type }) => {
      const previous: Array<[readonly unknown[], unknown]> = [];

      for (const prefix of REACT_QUERY_PREFIXES) {
        await queryClient.cancelQueries({ queryKey: prefix });
        const snapshots = queryClient.getQueriesData({ queryKey: prefix });
        previous.push(...snapshots);

        queryClient.setQueriesData({ queryKey: prefix }, (old) =>
          patchAllCaches(old, postId, type),
        );
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
    // We do not invalidate queries on settled because the socket will broadcast the exact likeCount anyway
  });
}

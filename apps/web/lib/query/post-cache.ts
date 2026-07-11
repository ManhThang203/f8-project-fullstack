import type { PostAuthorDto, PostFeedItemDto } from '@costy/shared';
import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from './query-keys';

type FeedCache = {
  pages: { data: PostFeedItemDto[]; meta?: unknown }[];
  pageParams: unknown[];
};

type AuthorProfilePatch = Partial<Pick<PostAuthorDto, 'image' | 'name' | 'username'>>;

/** Cập nhật một phần dữ liệu bài viết trong mọi cache infinite query feed (không refetch). */
export function patchFeedItemInCache(
  queryClient: QueryClient,
  postId: string,
  patch: Partial<PostFeedItemDto>,
): void {
  queryClient.setQueriesData<FeedCache>({ queryKey: queryKeys.posts.feed }, (old) => {
    if (!old) return old;
    return patchInfiniteDataPages(old, postId, patch);
  });
}

/** Patch savedByMe/shareCount trên cache list phụ (profile, search, saved) và post detail. */
export function patchPostItemInRelatedCaches(
  queryClient: QueryClient,
  postId: string,
  patch: Partial<Pick<PostFeedItemDto, 'savedByMe' | 'shareCount'>>,
): void {
  const listPrefixes = [['users', 'feed'], queryKeys.me.saved, ['search', 'posts']] as const;

  for (const queryKey of listPrefixes) {
    queryClient.setQueriesData({ queryKey }, (old) =>
      patchPostInUnknownCache(old, postId, patch),
    );
  }

  const detail = queryClient.getQueryData<PostFeedItemDto>(['posts', postId]);
  if (detail?.id === postId) {
    queryClient.setQueryData(['posts', postId], { ...detail, ...patch });
  }
}

/** Cập nhật avatar/tên author trong mọi cache bài viết/comment (sau khi đổi profile). */
export function patchAuthorProfileInCaches(
  queryClient: QueryClient,
  authorId: string,
  patch: AuthorProfilePatch,
): void {
  if (!('image' in patch) && patch.name === undefined && patch.username === undefined) return;

  const listPrefixes = [
    queryKeys.posts.feed,
    ['users', 'feed'],
    queryKeys.me.saved,
    ['search', 'posts'],
    ['posts', 'comments'],
  ] as const;

  for (const queryKey of listPrefixes) {
    queryClient.setQueriesData({ queryKey }, (old) =>
      patchAuthorInUnknownCache(old, authorId, patch),
    );
  }

  queryClient.setQueriesData<PostFeedItemDto>(
    {
      predicate: (query) => {
        const key = query.queryKey;
        if (!Array.isArray(key) || key[0] !== 'posts' || key.length !== 2) return false;
        const second = key[1];
        return second !== 'feed' && second !== 'comments' && second !== 'reels';
      },
    },
    (old) => {
      if (!old || typeof old !== 'object' || !('author' in old)) return old;
      if (!old.author || old.author.id !== authorId) return old;
      if ('pages' in old) return old;
      return { ...old, author: { ...old.author, ...patch } };
    },
  );
}

/** Map pages.data của infinite feed cache; giữ reference cũ nếu không có item khớp. */
function patchInfiniteDataPages(
  old: FeedCache,
  postId: string,
  patch: Partial<PostFeedItemDto>,
): FeedCache {
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
}

/** Patch author theo authorId trong item bài viết/comment. */
function patchPostAuthor(
  item: PostFeedItemDto,
  authorId: string,
  patch: AuthorProfilePatch,
): PostFeedItemDto {
  if (item.author.id !== authorId) return item;
  return { ...item, author: { ...item.author, ...patch } };
}

/** Patch author trong cache dạng infinite pages.data / pages.items, flat array, hoặc { data: [] }. */
function patchAuthorInUnknownCache(
  old: unknown,
  authorId: string,
  patch: AuthorProfilePatch,
): unknown {
  if (!old || typeof old !== 'object') return old;

  if ('pages' in old && Array.isArray((old as FeedCache).pages)) {
    const pages = (old as { pages: unknown[] }).pages;
    let changed = false;
    const nextPages = pages.map((page) => {
      if (!page || typeof page !== 'object') return page;

      if ('data' in page && Array.isArray((page as { data: unknown }).data)) {
        const data = (page as { data: PostFeedItemDto[] }).data;
        const next = data.map((item) => {
          const patched = patchPostAuthor(item, authorId, patch);
          if (patched !== item) changed = true;
          return patched;
        });
        return changed ? { ...page, data: next } : page;
      }

      if ('items' in page && Array.isArray((page as { items: unknown }).items)) {
        const items = (page as { items: PostFeedItemDto[] }).items;
        let pageChanged = false;
        const next = items.map((item) => {
          const patched = patchPostAuthor(item, authorId, patch);
          if (patched !== item) pageChanged = true;
          return patched;
        });
        if (pageChanged) changed = true;
        return pageChanged ? { ...page, items: next } : page;
      }

      return page;
    });
    return changed ? { ...old, pages: nextPages } : old;
  }

  if (Array.isArray(old)) {
    let changed = false;
    const next = old.map((item) => {
      if (!item || typeof item !== 'object' || !('author' in item)) return item;
      const patched = patchPostAuthor(item as PostFeedItemDto, authorId, patch);
      if (patched !== item) changed = true;
      return patched;
    });
    return changed ? next : old;
  }

  if ('data' in old && Array.isArray((old as { data: unknown }).data)) {
    const data = (old as { data: PostFeedItemDto[] }).data;
    let changed = false;
    const next = data.map((item) => {
      const patched = patchPostAuthor(item, authorId, patch);
      if (patched !== item) changed = true;
      return patched;
    });
    return changed ? { ...old, data: next } : old;
  }

  return old;
}

/** Patch post theo id trong cache dạng infinite pages.data, flat array, hoặc { data: [] }. */
function patchPostInUnknownCache(
  old: unknown,
  postId: string,
  patch: Partial<PostFeedItemDto>,
): unknown {
  if (!old || typeof old !== 'object') return old;

  if ('pages' in old && Array.isArray((old as FeedCache).pages)) {
    const first = (old as FeedCache).pages[0];
    if (first && 'data' in first && Array.isArray(first.data)) {
      return patchInfiniteDataPages(old as FeedCache, postId, patch);
    }
    return old;
  }

  if (Array.isArray(old)) {
    let changed = false;
    const next = old.map((item) => {
      if (
        !item ||
        typeof item !== 'object' ||
        !('id' in item) ||
        (item as PostFeedItemDto).id !== postId
      ) {
        return item;
      }
      changed = true;
      return { ...(item as PostFeedItemDto), ...patch };
    });
    return changed ? next : old;
  }

  if ('data' in old && Array.isArray((old as { data: unknown }).data)) {
    const data = (old as { data: PostFeedItemDto[] }).data;
    let changed = false;
    const next = data.map((item) => {
      if (item.id !== postId) return item;
      changed = true;
      return { ...item, ...patch };
    });
    return changed ? { ...old, data: next } : old;
  }

  return old;
}

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

/** Nối reply mới vào cuối cache danh sách reply (order asc, dedupe theo id). */
export function appendReplyToCache(
  queryClient: QueryClient,
  parentId: string,
  reply: PostFeedItemDto,
): void {
  queryClient.setQueriesData<CommentsCache>(
    { queryKey: ['posts', 'comments', parentId] },
    (old) => {
      if (!old || old.pages.length === 0) {
        return {
          pages: [{ items: [reply], nextCursor: null }],
          pageParams: [null],
        };
      }
      const exists = old.pages.some((page) => page.items.some((c) => c.id === reply.id));
      if (exists) return old;
      const lastIndex = old.pages.length - 1;
      return {
        ...old,
        pages: old.pages.map((page, i) =>
          i === lastIndex ? { ...page, items: [...page.items, reply] } : page,
        ),
      };
    },
  );
}

/** Tăng/giảm replyCount của comment trong mọi cache danh sách comment. */
export function bumpReplyCountInCommentCaches(
  queryClient: QueryClient,
  commentId: string,
  delta: number,
): void {
  queryClient.setQueriesData<CommentsCache>({ queryKey: ['posts', 'comments'] }, (old) => {
    if (!old) return old;
    let changed = false;
    const pages = old.pages.map((page) => ({
      ...page,
      items: page.items.map((c) => {
        if (c.id !== commentId) return c;
        changed = true;
        return { ...c, replyCount: Math.max(0, c.replyCount + delta) };
      }),
    }));
    return changed ? { ...old, pages } : old;
  });
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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSharePost, useToggleSavePost } from './use-save-post';

const apiQueryDataMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', () => ({
  apiQueryData: apiQueryDataMock,
}));

const REELS_KEY = ['posts', 'reels', ''] as const;
const FEED_KEY = ['posts', 'feed', 'recent', 'all'] as const;

function spyOnInvalidate(queryClient: QueryClient) {
  return vi.spyOn(queryClient, 'invalidateQueries');
}

function seedReel(queryClient: QueryClient) {
  queryClient.setQueryData(REELS_KEY, {
    pages: [
      {
        data: [{ id: 'reel-1', savedByMe: false, shareCount: 3 }],
        meta: { nextCursor: null },
      },
    ],
    pageParams: [undefined],
  });
}

function seedFeed(queryClient: QueryClient) {
  queryClient.setQueryData(FEED_KEY, {
    pages: [
      {
        data: [{ id: 'reel-1', savedByMe: false, shareCount: 3 }],
        meta: { nextCursor: null },
      },
    ],
    pageParams: [undefined],
  });
}

type ItemCache = {
  pages: { data: { id: string; savedByMe: boolean; shareCount: number }[] }[];
};

describe('save/share mutations không refetch feed/reels', () => {
  let queryClient: QueryClient;
  let invalidateSpy: ReturnType<typeof spyOnInvalidate>;
  let wrapper: ({ children }: { children: ReactNode }) => ReactNode;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    seedReel(queryClient);
    seedFeed(queryClient);
    invalidateSpy = spyOnInvalidate(queryClient);
    wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  });

  it('useToggleSavePost patch savedByMe vào feed + reels, không invalidate feed/reels', async () => {
    apiQueryDataMock.mockResolvedValue({ savedByMe: true });

    const { result } = renderHook(() => useToggleSavePost(), { wrapper });
    result.current.mutate({ postId: 'reel-1', save: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData<ItemCache>(REELS_KEY)?.pages[0]?.data[0]).toMatchObject({
      id: 'reel-1',
      savedByMe: true,
    });
    expect(queryClient.getQueryData<ItemCache>(FEED_KEY)?.pages[0]?.data[0]).toMatchObject({
      id: 'reel-1',
      savedByMe: true,
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map(
      (call) => (call[0] as { queryKey: unknown[] }).queryKey,
    );
    expect(invalidatedKeys).not.toContainEqual(['posts', 'reels']);
    expect(invalidatedKeys).not.toContainEqual(['posts', 'feed']);
    expect(invalidatedKeys).toContainEqual(['me', 'saved']);
  });

  it('useSharePost patch shareCount vào feed + reels, không invalidate feed/reels', async () => {
    apiQueryDataMock.mockResolvedValue({ shareCount: 4 });

    const { result } = renderHook(() => useSharePost(), { wrapper });
    result.current.mutate('reel-1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData<ItemCache>(REELS_KEY)?.pages[0]?.data[0]).toMatchObject({
      id: 'reel-1',
      shareCount: 4,
    });
    expect(queryClient.getQueryData<ItemCache>(FEED_KEY)?.pages[0]?.data[0]).toMatchObject({
      id: 'reel-1',
      shareCount: 4,
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map(
      (call) => (call[0] as { queryKey: unknown[] }).queryKey,
    );
    expect(invalidatedKeys).not.toContainEqual(['posts', 'reels']);
    expect(invalidatedKeys).not.toContainEqual(['posts', 'feed']);
    expect(invalidatedKeys).toHaveLength(0);
  });
});

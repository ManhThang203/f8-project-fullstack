import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReelsFeed } from './reels-feed';

const useReelsFeedMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/shared/providers/current-user-context', () => ({
  useInitialUser: () => null,
}));

vi.mock('@/hooks/queries/reels', () => ({
  useReelsFeed: useReelsFeedMock,
  flattenReelsFeedPages: (pages: { data: unknown[] }[] | undefined) =>
    pages?.flatMap((p) => p.data) ?? [],
}));

vi.mock('./reels-slide', async () => {
  const { createElement } = await import('react');
  return {
    ReelsSlide: ({ item }: { item: { id: string } }) =>
      createElement('div', { 'data-testid': `slide-${item.id}` }, item.id),
  };
});

// Virtuoso không đo layout được trong jsdom — thay bằng scroller giả có clientHeight cố định
vi.mock('react-virtuoso', async () => {
  const React = await import('react');
  const SLIDE_HEIGHT = 800;

  type VirtuosoProps = {
    data?: { id: string }[];
    itemContent: (index: number, item: { id: string }) => React.ReactNode;
    scrollerRef?: (el: HTMLElement | null) => void;
  };

  const Virtuoso = React.forwardRef<unknown, VirtuosoProps>(function VirtuosoMock(props, ref) {
    const elRef = React.useRef<HTMLDivElement | null>(null);
    React.useImperativeHandle(ref, () => ({ scrollToIndex: () => {} }));
    React.useEffect(() => {
      const el = elRef.current;
      if (!el) return;
      Object.defineProperty(el, 'clientHeight', { value: SLIDE_HEIGHT, configurable: true });
      props.scrollerRef?.(el);
    });
    return React.createElement(
      'div',
      { ref: elRef, 'data-testid': 'reels-scroller' },
      props.data?.map((item, index) =>
        React.createElement('div', { key: item.id }, props.itemContent(index, item)),
      ),
    );
  });

  return { Virtuoso };
});

function makeItem(id: string) {
  return {
    id,
    content: `reel ${id}`,
    createdAt: new Date().toISOString(),
    author: { id: `author-${id}`, username: `user-${id}`, name: null, image: null },
    replyCount: 0,
    commentCount: 0,
    likeCount: 0,
    shareCount: 0,
    myReaction: null,
    savedByMe: false,
    topReactions: [],
    isFollowing: false,
    video: {
      id: `media-${id}`,
      type: 'video',
      url: `https://cdn.test/${id}.mp4`,
      width: null,
      height: null,
      durationMs: null,
      position: 0,
    },
  };
}

function mockFeedWith(ids: string[]) {
  useReelsFeedMock.mockReturnValue({
    data: { pages: [{ data: ids.map(makeItem), meta: { nextCursor: null } }], pageParams: [undefined] },
    isLoading: false,
    isError: false,
    error: null,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  });
}

describe('ReelsFeed — sync URL theo reel đang xem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/reels');
  });

  it('sync URL về reel đầu tiên sau khi load', async () => {
    mockFeedWith(['r1', 'r2', 'r3']);
    render(<ReelsFeed />);

    await waitFor(() => expect(window.location.pathname).toBe('/reel/r1'));
  });

  it('đổi id trên URL khi cuộn sang reel khác', async () => {
    mockFeedWith(['r1', 'r2', 'r3']);
    render(<ReelsFeed />);
    await waitFor(() => expect(window.location.pathname).toBe('/reel/r1'));

    const scroller = screen.getByTestId('reels-scroller');
    Object.defineProperty(scroller, 'scrollTop', { value: 800, configurable: true });
    fireEvent.scroll(scroller);

    await waitFor(() => expect(window.location.pathname).toBe('/reel/r2'));
  });

  it('giữ URL theo reel đang xem khi danh sách bị patch không đổi id', async () => {
    mockFeedWith(['r1', 'r2', 'r3']);
    const { rerender } = render(<ReelsFeed />);

    const scroller = screen.getByTestId('reels-scroller');
    Object.defineProperty(scroller, 'scrollTop', { value: 1600, configurable: true });
    fireEvent.scroll(scroller);
    await waitFor(() => expect(window.location.pathname).toBe('/reel/r3'));

    // Giả lập patch cache (setQueriesData): mảng mới, cùng thứ tự id
    mockFeedWith(['r1', 'r2', 'r3']);
    rerender(<ReelsFeed />);

    await waitFor(() => expect(window.location.pathname).toBe('/reel/r3'));
  });
});

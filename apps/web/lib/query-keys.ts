export const queryKeys = {
  posts: {
    feed: ['posts', 'feed'] as const,
    reels: (startPostId?: string) => ['posts', 'reels', startPostId ?? ''] as const,
  },
  users: {
    profile: (username: string) => ['users', 'profile', username] as const,
    grid: (username: string, tab: string) => ['users', 'grid', username, tab] as const,
    followList: (username: string, mode: string, q: string) =>
      ['users', mode, username, q] as const,
    search: (q: string) => ['users', 'search', q] as const,
  },
  chat: {
    conversations: ['chat', 'conversations'] as const,
    roomMessages: (roomId: string) => ['chat', 'rooms', roomId, 'messages'] as const,
    threadMessages: (threadKey: string) => ['chat', 'thread', threadKey] as const,
  },
  notifications: {
    all: () => ['notifications'] as const,
    unreadCount: () => ['notifications', 'unreadCount'] as const,
  },
} as const;

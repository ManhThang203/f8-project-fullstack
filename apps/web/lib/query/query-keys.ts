export const queryKeys = {
  posts: {
    feed: ['posts', 'feed'] as const,
    reels: (startPostId?: string) => ['posts', 'reels', startPostId ?? ''] as const,
  },
  users: {
    profile: (username: string) => ['users', 'profile', username] as const,
    feed: (username: string) => ['users', 'feed', username] as const,
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
  friends: {
    list: (q: string) => ['friends', 'list', q] as const,
    requests: (type: 'incoming' | 'outgoing') => ['friends', 'requests', type] as const,
  },
  search: {
    posts: (q: string) => ['search', 'posts', q] as const,
    users: (q: string) => ['search', 'users', q] as const,
    hashtags: (q: string) => ['search', 'hashtags', q] as const,
  },
  me: {
    saved: ['me', 'saved'] as const,
    settings: ['me', 'settings'] as const,
    blocked: ['me', 'blocked'] as const,
  },
} as const;

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
    directMessages: (peerUserId: string) => ['chat', 'direct', peerUserId] as const,
    groupMessages: (groupId: number) => ['chat', 'group', groupId] as const,
    threadMessages: (threadKey: string) => ['chat', 'thread', threadKey] as const,
  },
} as const;

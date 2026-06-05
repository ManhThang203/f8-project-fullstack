export const queryKeys = {
  admin: {
    me: ['admin', 'me'] as const,
    statsOverview: (range: string) => ['admin', 'stats', 'overview', range] as const,
    postsPerDay: (range: string) => ['admin', 'stats', 'posts-per-day', range] as const,
    activeUsers: (range: string) => ['admin', 'stats', 'active-users', range] as const,
    topHashtags: (range: string) => ['admin', 'stats', 'top-hashtags', range] as const,
    users: (filters: string) => ['admin', 'users', filters] as const,
    user: (id: string) => ['admin', 'user', id] as const,
    reports: (filters: string) => ['admin', 'reports', filters] as const,
    hashtags: (filters: string) => ['admin', 'hashtags', filters] as const,
    moderators: ['admin', 'moderators'] as const,
    permissions: (userId: string) => ['admin', 'permissions', userId] as const,
    audit: (filters: string) => ['admin', 'audit', filters] as const,
  },
};

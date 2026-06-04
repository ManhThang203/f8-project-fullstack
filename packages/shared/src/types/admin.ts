/** Vai trò người dùng trong hệ thống RBAC. */
export type Role = 'USER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';

/** Trạng thái tài khoản. */
export type UserStatus = 'ACTIVE' | 'LOCKED' | 'BANNED';

export type ReportTargetType = 'POST' | 'USER' | 'COMMENT';
export type ReportReason =
  | 'SPAM'
  | 'HARASSMENT'
  | 'NUDITY'
  | 'VIOLENCE'
  | 'HATE_SPEECH'
  | 'OTHER';
export type ReportStatus = 'PENDING' | 'RESOLVED' | 'REJECTED' | 'ACTION_TAKEN';

export type HashtagStatus = 'ACTIVE' | 'HIDDEN' | 'BLOCKED';

export type PermissionEffect = 'GRANT' | 'REVOKE';

export type AdminUserListItemDto = {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: Role;
  status: UserStatus;
  bannedUntil: string | null;
  statusReason: string | null;
  createdAt: string;
  postCount: number;
};

export type AdminUserDetailDto = AdminUserListItemDto & {
  permissions: string[];
};

export type AdminReportDto = {
  id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  reporter?: { id: string; username: string; name: string | null; image: string | null };
  reportCount?: number;
  targetPreview?: string | null;
};

export type AdminHashtagDto = {
  id: string;
  tag: string;
  status: HashtagStatus;
  featured: boolean;
  postCount: number;
  growthPct: number;
  createdAt: string;
};

export type AdminAuditLogDto = {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor?: { id: string; username: string; name: string | null };
};

export type AdminPermissionDto = {
  id: string;
  key: string;
  domain: string;
  label: string;
  isDefaultForRole: boolean;
  effect: PermissionEffect | null;
};

export type AdminModeratorDto = {
  id: string;
  username: string;
  name: string | null;
  role: Role;
  permissionCount: number;
  grantedAt: string | null;
  grantedBy: { id: string; username: string } | null;
};

export type AdminStatsOverviewDto = {
  totalUsers: number;
  newUsersToday: number;
  dau: number;
  wau: number;
  mau: number;
  postsToday: number;
  pendingReports: number;
  reportResolutionRate: number;
  activeHashtags: number;
  reportStatusBreakdown: {
    pending: number;
    resolved: number;
    rejected: number;
    actionTaken: number;
  };
};

export type AdminPostsPerDayDto = {
  date: string;
  count: number;
};

export type AdminActiveUsersDto = {
  date: string;
  count: number;
};

export type AdminTopHashtagDto = {
  tag: string;
  count: number;
  growthPct: number;
};

export type AdminStatsMeta = {
  cachedAt: string;
  range: string;
};

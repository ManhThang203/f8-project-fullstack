import type {
  AdminActiveUsersDto,
  AdminAuditLogDto,
  AdminHashtagDto,
  AdminModeratorDto,
  AdminPermissionDto,
  AdminPostsPerDayDto,
  AdminReportDto,
  AdminStatsMeta,
  AdminStatsOverviewDto,
  AdminTopHashtagDto,
  AdminUserListItemDto,
} from '@costy/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiQuery } from '@/lib/api-query';
import { queryKeys } from '@/lib/query-keys';

// ── helpers ──────────────────────────────────────────────────────────
/** Gộp tất cả page của useInfiniteQuery thành mảng phẳng. */
export function flattenPages<T>(pages: { data: T[] }[] | undefined): T[] {
  return pages?.flatMap((p) => p.data) ?? [];
}

// ── non-paginated queries ────────────────────────────────────────────
export function useAdminMe() {
  return useQuery({
    queryKey: queryKeys.admin.me,
    queryFn: () => apiQuery<{ permissions: string[]; role: string }>('/admin/me/permissions'),
  });
}

export function useStatsOverview(range = '30d') {
  return useQuery({
    queryKey: queryKeys.admin.statsOverview(range),
    queryFn: () =>
      apiQuery<AdminStatsOverviewDto, AdminStatsMeta>(`/admin/stats/overview?range=${range}`),
  });
}

export function usePostsPerDay(range = '30d') {
  return useQuery({
    queryKey: queryKeys.admin.postsPerDay(range),
    queryFn: () => apiQuery<AdminPostsPerDayDto[]>(`/admin/stats/posts-per-day?range=${range}`),
  });
}

export function useActiveUsers(range = '30d') {
  return useQuery({
    queryKey: queryKeys.admin.activeUsers(range),
    queryFn: () => apiQuery<AdminActiveUsersDto[]>(`/admin/stats/active-users?range=${range}`),
  });
}

export function useTopHashtags(range = '7d') {
  return useQuery({
    queryKey: queryKeys.admin.topHashtags(range),
    queryFn: () => apiQuery<AdminTopHashtagDto[]>(`/admin/stats/top-hashtags?range=${range}`),
  });
}

export function useUserPermissions(userId: string) {
  return useQuery({
    queryKey: queryKeys.admin.permissions(userId),
    queryFn: () => apiQuery<AdminPermissionDto[]>(`/admin/users/${userId}/permissions`),
    enabled: Boolean(userId),
  });
}

// ── paginated (cursor-based) queries ──────────────────────────────────
type CursorMeta = { nextCursor: string | null };

export function useAdminUsers(filters: { q?: string; status?: string; cursor?: string; limit?: number } = {}) {
  const base = new URLSearchParams();
  if (filters.q) base.set('q', filters.q);
  if (filters.status) base.set('status', filters.status);
  if (filters.cursor) base.set('cursor', filters.cursor);
  if (filters.limit) base.set('limit', String(filters.limit));
  const filterKey = base.toString();

  return useQuery({
    queryKey: queryKeys.admin.users(filterKey),
    queryFn: () => {
      const suffix = filterKey ? `?${filterKey}` : '';
      return apiQuery<AdminUserListItemDto[], CursorMeta>(`/admin/users${suffix}`);
    },
  });
}

export function useAdminReports(status = 'PENDING', cursor?: string, limit?: number) {
  const base = new URLSearchParams({ status });
  if (cursor) base.set('cursor', cursor);
  if (limit) base.set('limit', String(limit));
  const filterKey = base.toString();

  return useQuery({
    queryKey: queryKeys.admin.reports(filterKey),
    queryFn: () => {
      return apiQuery<AdminReportDto[], CursorMeta>(`/admin/reports?${base}`);
    },
  });
}

export function useAdminHashtags(range = '7d', cursor?: string, limit?: number) {
  const base = new URLSearchParams({ range });
  if (cursor) base.set('cursor', cursor);
  if (limit) base.set('limit', String(limit));
  const filterKey = base.toString();

  return useQuery({
    queryKey: queryKeys.admin.hashtags(filterKey),
    queryFn: () => {
      return apiQuery<AdminHashtagDto[], CursorMeta>(`/admin/hashtags?${base}`);
    },
  });
}

export function useModerators(cursor?: string, limit?: number) {
  const base = new URLSearchParams();
  if (cursor) base.set('cursor', cursor);
  if (limit) base.set('limit', String(limit));
  const filterKey = base.toString();

  return useQuery({
    queryKey: ['admin', 'moderators', filterKey],
    queryFn: () => {
      const suffix = filterKey ? `?${filterKey}` : '';
      return apiQuery<AdminModeratorDto[], CursorMeta>(`/admin/moderators${suffix}`);
    },
  });
}

export function useAuditLogs(cursor?: string, limit?: number) {
  const base = new URLSearchParams();
  if (cursor) base.set('cursor', cursor);
  if (limit) base.set('limit', String(limit));
  const filterKey = base.toString();

  return useQuery({
    queryKey: queryKeys.admin.audit(filterKey),
    queryFn: () => {
      const suffix = filterKey ? `?${filterKey}` : '';
      return apiQuery<AdminAuditLogDto[], CursorMeta>(`/admin/audit-logs${suffix}`);
    },
  });
}

export function usePatchUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opts: { id: string; action: string; reason: string; bannedUntil?: string }) =>
      apiQuery(`/admin/users/${opts.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          action: opts.action,
          reason: opts.reason,
          bannedUntil: opts.bannedUntil,
        }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

export function useReviewReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opts: { id: string; status: string; resolutionNote?: string }) =>
      apiQuery(`/admin/reports/${opts.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: opts.status,
          resolutionNote: opts.resolutionNote,
        }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

export function usePatchHashtag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opts: { id: string; action: string }) =>
      apiQuery(`/admin/hashtags/${opts.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: opts.action }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'hashtags'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

export function useUpdateUserPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opts: { id: string; grants: string[]; revokes: string[] }) =>
      apiQuery(`/admin/users/${opts.id}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({
          grants: opts.grants,
          revokes: opts.revokes,
        }),
      }),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.permissions(variables.id) });
      void qc.invalidateQueries({ queryKey: ['admin', 'moderators'] });
    },
  });
}


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
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';

import { apiQuery } from '@/lib/api-query';
import { queryKeys } from '@/lib/query-keys';

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

export function useAdminUsers(filters: { q?: string; status?: string } = {}) {
  const qs = new URLSearchParams();
  if (filters.q) qs.set('q', filters.q);
  if (filters.status) qs.set('status', filters.status);
  const suffix = qs.toString() ? `?${qs}` : '';
  return useQuery({
    queryKey: queryKeys.admin.users(suffix),
    queryFn: () =>
      apiQuery<AdminUserListItemDto[], { nextCursor: string | null }>(`/admin/users${suffix}`),
    placeholderData: keepPreviousData,
  });
}

export function useAdminReports(status = 'PENDING') {
  return useQuery({
    queryKey: queryKeys.admin.reports(status),
    queryFn: () =>
      apiQuery<AdminReportDto[], { nextCursor: string | null }>(
        `/admin/reports?status=${status}&limit=20`,
      ),
  });
}

export function useAdminHashtags(range = '7d') {
  return useQuery({
    queryKey: queryKeys.admin.hashtags(range),
    queryFn: () =>
      apiQuery<AdminHashtagDto[], { nextCursor: string | null }>(
        `/admin/hashtags?range=${range}`,
      ),
  });
}

export function useModerators() {
  return useQuery({
    queryKey: queryKeys.admin.moderators,
    queryFn: () => apiQuery<AdminModeratorDto[]>('/admin/moderators'),
  });
}

export function useUserPermissions(userId: string) {
  return useQuery({
    queryKey: queryKeys.admin.permissions(userId),
    queryFn: () => apiQuery<AdminPermissionDto[]>(`/admin/users/${userId}/permissions`),
    enabled: Boolean(userId),
  });
}

export function useAuditLogs() {
  return useQuery({
    queryKey: queryKeys.admin.audit(''),
    queryFn: () =>
      apiQuery<AdminAuditLogDto[], { nextCursor: string | null }>('/admin/audit-logs?limit=30'),
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

import { z } from 'zod';

export const adminDateRangeQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  range: z.enum(['24h', '7d', '30d', '90d']).default('30d'),
});

export const adminUserListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().max(100).optional(),
  status: z.enum(['ACTIVE', 'LOCKED', 'BANNED']).optional(),
  role: z.enum(['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN']).optional(),
});

export const adminUserStatusPatchSchema = z.object({
  action: z.enum(['lock', 'unlock', 'ban_temp', 'ban_perm', 'unban']),
  reason: z.string().min(1).max(500),
  bannedUntil: z.string().datetime().optional(),
});

export const adminReportListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(['PENDING', 'RESOLVED', 'REJECTED', 'ACTION_TAKEN']).optional(),
  targetType: z.enum(['POST', 'USER', 'COMMENT']).optional(),
  reason: z
    .enum(['SPAM', 'HARASSMENT', 'NUDITY', 'VIOLENCE', 'HATE_SPEECH', 'OTHER'])
    .optional(),
});

export const adminReportReviewSchema = z.object({
  status: z.enum(['RESOLVED', 'REJECTED', 'ACTION_TAKEN']),
  resolutionNote: z.string().max(1000).optional(),
});

export const adminReportActionSchema = z.object({
  action: z.enum(['hide_post', 'delete_post', 'ban_author_temp', 'ban_author_perm']),
  reason: z.string().min(1).max(500),
  bannedUntil: z.string().datetime().optional(),
});

export const createReportBodySchema = z.object({
  targetType: z.enum(['POST', 'USER', 'COMMENT']),
  targetId: z.string().min(1),
  reason: z.enum(['SPAM', 'HARASSMENT', 'NUDITY', 'VIOLENCE', 'HATE_SPEECH', 'OTHER']),
  description: z.string().max(1000).optional(),
});

export const adminHashtagListQuerySchema = z.object({
  range: z.enum(['24h', '7d', '30d']).default('7d'),
  q: z.string().max(50).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const adminHashtagPatchSchema = z.object({
  action: z.enum(['feature', 'unfeature', 'hide', 'block', 'activate']),
});

export const adminPromoteModeratorSchema = z.object({
  userId: z.string().min(1),
});

export const adminUserPermissionsPutSchema = z.object({
  grants: z.array(z.string()).default([]),
  revokes: z.array(z.string()).default([]),
});

export const adminAuditLogQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  actorId: z.string().optional(),
  action: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type AdminDateRangeQuery = z.infer<typeof adminDateRangeQuerySchema>;
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type AdminUserStatusPatch = z.infer<typeof adminUserStatusPatchSchema>;
export type AdminReportListQuery = z.infer<typeof adminReportListQuerySchema>;
export type AdminReportReview = z.infer<typeof adminReportReviewSchema>;
export type AdminReportAction = z.infer<typeof adminReportActionSchema>;
export type CreateReportBody = z.infer<typeof createReportBodySchema>;

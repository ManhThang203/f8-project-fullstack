import { z } from 'zod';

export const moderationCaseListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  /** Hàng đợi chờ admin: PENDING + AUTO_HIDDEN */
  queue: z.enum(['open']).optional(),
  status: z
    .enum(['PENDING', 'AUTO_HIDDEN', 'RESOLVED_KEPT', 'RESOLVED_REMOVED', 'DISMISSED'])
    .optional(),
  label: z
    .enum(['TOXIC', 'SPAM', 'HARASSMENT', 'HATE', 'SEXUAL', 'VIOLENCE', 'SELF_HARM', 'OTHER'])
    .optional(),
  targetType: z.enum(['POST', 'COMMENT']).optional(),
});

export type ModerationCaseListQuery = z.infer<typeof moderationCaseListQuerySchema>;

export const moderationCaseActionSchema = z.object({
  action: z.enum(['KEEP', 'REMOVE', 'DISMISS']),
  resolutionNote: z.string().min(1).max(1000),
});

export type ModerationCaseActionBody = z.infer<typeof moderationCaseActionSchema>;

export const appealSubmitSchema = z.object({
  message: z.string().min(10).max(2000),
});

export type AppealSubmitBody = z.infer<typeof appealSubmitSchema>;

export const appealReviewSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  decisionNote: z.string().min(1).max(1000),
});

export type AppealReviewBody = z.infer<typeof appealReviewSchema>;

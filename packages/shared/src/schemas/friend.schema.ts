import { z } from 'zod';

export const friendUserIdParamSchema = z.object({
  userId: z.string().min(1),
});
export type FriendUserIdParam = z.infer<typeof friendUserIdParamSchema>;

export const friendListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().optional(),
});
export type FriendListQuery = z.infer<typeof friendListQuerySchema>;

export const friendRequestsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  type: z.enum(['incoming', 'outgoing']),
});
export type FriendRequestsQuery = z.infer<typeof friendRequestsQuerySchema>;

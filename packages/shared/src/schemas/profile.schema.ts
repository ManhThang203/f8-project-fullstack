import { z } from 'zod';

export const usernameParamSchema = z.object({
  username: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_.]+$/, 'Invalid username'),
});
export type UsernameParam = z.infer<typeof usernameParamSchema>;

export const userIdParamSchema = z.object({
  id: z.string().min(1),
});
export type UserIdParam = z.infer<typeof userIdParamSchema>;

export const profilePostsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  kind: z.enum(['image', 'video']).default('image'),
});
export type ProfilePostsQuery = z.infer<typeof profilePostsQuerySchema>;

export const profileListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().optional(),
});
export type ProfileListQuery = z.infer<typeof profileListQuerySchema>;

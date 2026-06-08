import { z } from 'zod';

export const cursorPageQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type CursorPageQuery = z.infer<typeof cursorPageQuerySchema>;

export const reelsFeedQuerySchema = cursorPageQuerySchema.extend({
  startPostId: z.string().min(1).optional(),
});
export type ReelsFeedQuery = z.infer<typeof reelsFeedQuerySchema>;

export const offsetPageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type OffsetPageQuery = z.infer<typeof offsetPageQuerySchema>;

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(200),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

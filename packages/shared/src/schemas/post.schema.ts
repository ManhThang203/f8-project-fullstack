import { z } from 'zod';

export const createPostBodySchema = z.object({
  content: z.string().trim().min(1).max(2000),
  parentId: z.string().cuid().optional(),
});

export type CreatePostBody = z.infer<typeof createPostBodySchema>;

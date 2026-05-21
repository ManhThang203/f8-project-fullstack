import { z } from 'zod';

export const createPostBodySchema = z.object({
  content: z.string().trim().max(2000).default(''), // 2000 ký tự
  parentId: z.string().cuid().optional(), // id của bài viết cha
});

export type CreatePostBody = z.infer<typeof createPostBodySchema>;

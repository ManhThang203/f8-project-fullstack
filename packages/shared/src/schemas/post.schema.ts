import { z } from 'zod';

export const postVisibilitySchema = z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE']);
export type PostVisibility = z.infer<typeof postVisibilitySchema>;

export const createPostBodySchema = z.object({
  content: z.string().trim().max(2000).default(''), // 2000 ký tự
  parentId: z.string().cuid().optional(), // id của bài viết cha
  visibility: postVisibilitySchema.default('PUBLIC'),
});

export type CreatePostBody = z.infer<typeof createPostBodySchema>;

export const updatePostBodySchema = z
  .object({
    content: z.string().trim().max(2000).optional(),
    visibility: postVisibilitySchema.optional(),
  })
  .refine((d) => d.content !== undefined || d.visibility !== undefined, {
    message: 'Không có thay đổi nào',
  });

export type UpdatePostBody = z.infer<typeof updatePostBodySchema>;

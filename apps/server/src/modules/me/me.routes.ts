import { createAppealBodySchema, ok } from '@costy/shared';
import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  createAppealForPost,
  listRestrictedPostsForUser,
} from '../admin/moderation-cases.service.js';

export const meRouter = Router();

meRouter.use(requireAuth);

/** GET /me/restricted-posts — bài bị ẩn của user hiện tại. */
meRouter.get('/restricted-posts', async (req, res, next) => {
  try {
    const items = await listRestrictedPostsForUser(req.auth!.userId);
    res.json(ok(items));
  } catch (e) {
    next(e);
  }
});

/** POST /me/posts/:postId/appeal — gửi kháng nghị. */
meRouter.post('/posts/:postId/appeal', async (req, res, next) => {
  try {
    const postId =
      typeof req.params.postId === 'string' ? req.params.postId : (req.params.postId?.[0] ?? '');
    const body = createAppealBodySchema.parse(req.body);
    const appeal = await createAppealForPost(req.auth!.userId, postId, body.message);
    res.json(ok(appeal));
  } catch (e) {
    next(e);
  }
});

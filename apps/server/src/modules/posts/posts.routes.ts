import {
  createPostBodySchema,
  cursorPageQuerySchema,
  ok,
  type CursorPageQuery,
} from '@threads/shared';
import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { sanitizeBody } from '../../middleware/sanitize.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';

import * as postsService from './posts.service.js';
const router = Router();

/**
 * @openapi
 * /posts:
 *   get:
 *     summary: Home feed (root posts)
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated feed
 */
router.get('/', validate(cursorPageQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, nextCursor } = await postsService.listFeed(req.query as unknown as CursorPageQuery);
    res.json(ok(items, { nextCursor }));
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /posts:
 *   post:
 *     summary: Create a post or reply
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *               parentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Created post
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  requireAuth,
  sanitizeBody,
  validate(createPostBodySchema),
  async (req, res, next) => {
    try {
      const userId = req.auth!.userId;
      const created = await postsService.createPost(userId, req.body);
      res.status(201).json(ok(created));
    } catch (e) {
      next(e);
    }
  },
);

export { router as postsRouter };

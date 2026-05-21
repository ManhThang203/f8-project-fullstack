import { createPostBodySchema, cursorPageQuerySchema, ok, type CursorPageQuery } from '@threads/shared';
import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { uploadPostMedia } from '../../middleware/upload.middleware.js';
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
 *     summary: Create a post with optional media (multipart)
 *     tags: [Posts]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Created post
 */
router.post('/', requireAuth, uploadPostMedia, async (req, res, next) => {
  try {
    const body = createPostBodySchema.parse(req.body);
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const post = await postsService.createPost({
      authorId: req.auth!.userId,
      body,
      files,
    });
    res.status(201).json(ok(post));
  } catch (e) {
    next(e);
  }
});

export { router as postsRouter };

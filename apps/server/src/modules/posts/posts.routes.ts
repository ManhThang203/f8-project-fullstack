import {
  createPostBodySchema,
  cursorPageQuerySchema,
  feedQuerySchema,
  ok,
  reelsFeedQuerySchema,
  updatePostBodySchema,
  type CursorPageQuery,
  type FeedQuery,
  type ReelsFeedQuery,
} from '@costy/shared';
import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { realtimeBroadcast } from '../../middleware/realtime.middleware.js';
import { uploadPostMedia } from '../../middleware/upload.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';

import * as postsService from './posts.service.js';

const router = Router();

/**
 * @openapi
 * /posts/reels:
 *   get:
 *     summary: Random reels feed (video posts)
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
 *           default: 10
 *     responses:
 *       200:
 *         description: Shuffled reels feed
 */
router.get('/reels', validate(reelsFeedQuerySchema, 'query'), async (req, res, next) => {
  try {
    const viewerId = req.auth?.userId ?? null;
    const { items, nextCursor } = await postsService.listReelsFeed(
      req.query as unknown as ReelsFeedQuery,
      viewerId,
    );
    res.json(ok(items, { nextCursor }));
  } catch (e) {
    next(e);
  }
});

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
router.get('/', validate(feedQuerySchema, 'query'), async (req, res, next) => {
  try {
    const viewerId = req.auth?.userId ?? null;
    const { items, nextCursor } = await postsService.listFeed(
      req.query as unknown as FeedQuery,
      viewerId,
    );
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
router.post(
  '/',
  requireAuth,
  uploadPostMedia,
  async (req, res, next) => {
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
  },
);

import { z } from 'zod';

const reactionBodySchema = z.object({
  type: z.enum(['like', 'love', 'haha', 'wow', 'sad', 'angry', 'care']).nullable(),
});

/**
 * @openapi
 * /posts/{postId}/reactions:
 *   put:
 *     summary: Bày tỏ cảm xúc (like, haha...)
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: OK
 */
router.put(
  '/:postId/reactions',
  requireAuth,
  realtimeBroadcast({
    namespace: '/feed',
    event: 'post:reacted',
  }),
  async (req, res, next) => {
    try {
      const { type } = reactionBodySchema.parse(req.body);
      const result = await postsService.setPostReaction(
        req.params.postId as string,
        req.auth!.userId,
        type,
      );
      res.json(ok(result));
    } catch (e) {
      next(e);
    }
  },
);

/**
 * @openapi
 * /posts/{postId}:
 *   get:
 *     summary: Lấy chi tiết 1 bài viết
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/:postId', async (req, res, next) => {
  try {
    const viewerId = req.auth?.userId ?? null;
    const post = await postsService.getPostById(req.params.postId as string, viewerId);
    res.json(ok(post));
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /posts/{postId}/root:
 *   get:
 *     summary: Lấy id của bài viết gốc (đệ quy)
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/:postId/root', async (req, res, next) => {
  try {
    const rootPostId = await postsService.getRootPostId(req.params.postId as string);
    res.json(ok({ rootPostId }));
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /posts/{postId}/ancestry:
 *   get:
 *     summary: Chuỗi tổ tiên (cấp 1 → chính nó) của 1 comment/reply, dùng để cuộn tới khi deep-link sâu nhiều cấp
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/:postId/ancestry', async (req, res, next) => {
  try {
    const viewerId = req.auth?.userId ?? null;
    const items = await postsService.getCommentAncestryChain(req.params.postId as string, viewerId);
    res.json(ok(items));
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /posts/{postId}/comments:
 *   get:
 *     summary: Danh sách comment của bài viết
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: OK
 */
const commentQuerySchema = cursorPageQuerySchema.extend({
  order: z.enum(['asc', 'desc']).optional(),
});
router.get('/:postId/comments', validate(commentQuerySchema, 'query'), async (req, res, next) => {
  try {
    const viewerId = req.auth?.userId ?? null;
    const { items, nextCursor } = await postsService.listComments(
      req.params.postId as string,
      req.query as unknown as CursorPageQuery & { order?: 'asc' | 'desc' },
      viewerId,
    );
    res.json(ok(items, { nextCursor }));
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /posts/{postId}:
 *   put:
 *     summary: Sửa nội dung / chế độ riêng tư bài viết
 *     tags: [Posts]
 */
router.put(
  '/:postId',
  requireAuth,
  realtimeBroadcast({ namespace: '/feed', event: 'post:updated' }),
  async (req, res, next) => {
    try {
      const body = updatePostBodySchema.parse(req.body);
      const post = await postsService.editPost(req.params.postId as string, req.auth!.userId, body);
      res.json(ok(post));
    } catch (e) {
      next(e);
    }
  },
);

/**
 * @openapi
 * /posts/{postId}/save:
 *   post:
 *     summary: Lưu bài viết
 *     tags: [Posts]
 */
router.post('/:postId/save', requireAuth, async (req, res, next) => {
  try {
    const result = await postsService.savePost(req.params.postId as string, req.auth!.userId);
    res.json(ok(result));
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /posts/{postId}/save:
 *   delete:
 *     summary: Bỏ lưu bài viết
 *     tags: [Posts]
 */
router.delete('/:postId/save', requireAuth, async (req, res, next) => {
  try {
    const result = await postsService.unsavePost(req.params.postId as string, req.auth!.userId);
    res.json(ok(result));
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /posts/{postId}/share:
 *   post:
 *     summary: Chia sẻ bài viết (đếm lượt chia sẻ)
 *     tags: [Posts]
 */
router.post('/:postId/share', requireAuth, async (req, res, next) => {
  try {
    const result = await postsService.sharePost(req.params.postId as string, req.auth!.userId);
    res.json(ok(result));
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /posts/{postId}:
 *   delete:
 *     summary: Xóa bài viết / bình luận
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *     responses:
 *       200:
 *         description: OK
 */
router.delete(
  '/:postId',
  requireAuth,
  realtimeBroadcast({
    namespace: '/feed',
    event: 'post:deleted',
  }),
  async (req, res, next) => {
    try {
      const result = await postsService.deletePost(req.params.postId as string, req.auth!.userId);
      res.json(ok(result));
    } catch (e) {
      next(e);
    }
  },
);

export { router as postsRouter };

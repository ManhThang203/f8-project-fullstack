import {
  cursorPageQuerySchema,
  ok,
  profileListQuerySchema,
  profilePostsQuerySchema,
  userIdParamSchema,
  usernameParamSchema,
  type CursorPageQuery,
  type ProfileListQuery,
  type ProfilePostsQuery,
} from '@costy/shared';
import { Router } from 'express';
import { z } from 'zod';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';

import * as usersService from './users.service.js';

const router = Router();

const listQuerySchema = z.object({
  q: z.string().optional(),
});

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Gợi ý danh sách user (composer/share)
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Danh sách user
 */
router.get('/', requireAuth, validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { q } = req.query as z.infer<typeof listQuerySchema>;
    const rows = await usersService.listUsersForPicker(req.auth!.userId, q);
    res.json(ok(rows));
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /users/{username}/feed:
 *   get:
 *     summary: Feed đầy đủ bài viết trên trang cá nhân
 *     tags: [Users]
 *     security:
 *       - {}
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UsernamePath'
 *       - $ref: '#/components/parameters/CursorQuery'
 *       - $ref: '#/components/parameters/LimitQuery'
 *     responses:
 *       200:
 *         description: items + nextCursor
 */
router.get(
  '/:username/feed',
  validate(usernameParamSchema, 'params'),
  validate(cursorPageQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { username } = req.params as z.infer<typeof usernameParamSchema>;
      const viewerId = req.auth?.userId ?? null;
      const { items, nextCursor } = await usersService.listProfileFeed(
        username,
        req.query as unknown as CursorPageQuery,
        viewerId,
      );
      res.json(ok(items, { nextCursor }));
    } catch (e) {
      next(e);
    }
  },
);

/**
 * @openapi
 * /users/{username}/posts:
 *   get:
 *     summary: Grid bài viết (ảnh/video) của user
 *     tags: [Users]
 *     security:
 *       - {}
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UsernamePath'
 *       - $ref: '#/components/parameters/CursorQuery'
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 12 }
 *       - in: query
 *         name: kind
 *         schema: { type: string, enum: [image, video], default: image }
 *     responses:
 *       200:
 *         description: items + nextCursor
 */
router.get(
  '/:username/posts',
  validate(usernameParamSchema, 'params'),
  validate(profilePostsQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { username } = req.params as z.infer<typeof usernameParamSchema>;
      const viewerId = req.auth?.userId ?? null;
      const { items, nextCursor } = await usersService.listProfilePosts(
        username,
        req.query as unknown as ProfilePostsQuery,
        viewerId,
      );
      res.json(ok(items, { nextCursor }));
    } catch (e) {
      next(e);
    }
  },
);

/**
 * @openapi
 * /users/{username}/likes:
 *   get:
 *     summary: Bài viết đã thích (chỉ chủ tài khoản)
 *     tags: [Users]
 *     security:
 *       - {}
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UsernamePath'
 *       - $ref: '#/components/parameters/CursorQuery'
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 12 }
 *       - in: query
 *         name: kind
 *         schema: { type: string, enum: [image, video], default: image }
 *     responses:
 *       200:
 *         description: items + nextCursor
 */
router.get(
  '/:username/likes',
  validate(usernameParamSchema, 'params'),
  validate(profilePostsQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { username } = req.params as z.infer<typeof usernameParamSchema>;
      const viewerId = req.auth?.userId ?? null;
      const { items, nextCursor } = await usersService.listProfileLikes(
        username,
        viewerId,
        req.query as unknown as ProfilePostsQuery,
      );
      res.json(ok(items, { nextCursor }));
    } catch (e) {
      next(e);
    }
  },
);

/**
 * @openapi
 * /users/{username}/followers:
 *   get:
 *     summary: Danh sách người đang follow user này
 *     tags: [Users]
 *     security:
 *       - {}
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UsernamePath'
 *       - $ref: '#/components/parameters/CursorQuery'
 *       - $ref: '#/components/parameters/LimitQuery'
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: items + nextCursor
 */
router.get(
  '/:username/followers',
  validate(usernameParamSchema, 'params'),
  validate(profileListQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { username } = req.params as z.infer<typeof usernameParamSchema>;
      const viewerId = req.auth?.userId ?? null;
      const { items, nextCursor } = await usersService.listFollowers(
        username,
        viewerId,
        req.query as unknown as ProfileListQuery,
      );
      res.json(ok(items, { nextCursor }));
    } catch (e) {
      next(e);
    }
  },
);

/**
 * @openapi
 * /users/{username}/following:
 *   get:
 *     summary: Danh sách user mà người này đang follow
 *     tags: [Users]
 *     security:
 *       - {}
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UsernamePath'
 *       - $ref: '#/components/parameters/CursorQuery'
 *       - $ref: '#/components/parameters/LimitQuery'
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: items + nextCursor
 */
router.get(
  '/:username/following',
  validate(usernameParamSchema, 'params'),
  validate(profileListQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { username } = req.params as z.infer<typeof usernameParamSchema>;
      const viewerId = req.auth?.userId ?? null;
      const { items, nextCursor } = await usersService.listFollowing(
        username,
        viewerId,
        req.query as unknown as ProfileListQuery,
      );
      res.json(ok(items, { nextCursor }));
    } catch (e) {
      next(e);
    }
  },
);

/**
 * @openapi
 * /users/{id}/follow:
 *   post:
 *     summary: Follow một user
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdPath'
 *     responses:
 *       200:
 *         description: OK
 */
router.post(
  '/:id/follow',
  requireAuth,
  validate(userIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params as z.infer<typeof userIdParamSchema>;
      const result = await usersService.followUser(req.auth!.userId, id);
      res.json(ok(result));
    } catch (e) {
      next(e);
    }
  },
);

/**
 * @openapi
 * /users/{id}/follow:
 *   delete:
 *     summary: Hủy follow một user
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdPath'
 *     responses:
 *       200:
 *         description: OK
 */
router.delete(
  '/:id/follow',
  requireAuth,
  validate(userIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params as z.infer<typeof userIdParamSchema>;
      const result = await usersService.unfollowUser(req.auth!.userId, id);
      res.json(ok(result));
    } catch (e) {
      next(e);
    }
  },
);

/**
 * @openapi
 * /users/{username}:
 *   get:
 *     summary: Profile công khai của một user
 *     tags: [Users]
 *     security:
 *       - {}
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UsernamePath'
 *     responses:
 *       200:
 *         description: Profile
 */
router.get('/:username', validate(usernameParamSchema, 'params'), async (req, res, next) => {
  try {
    const { username } = req.params as z.infer<typeof usernameParamSchema>;
    const viewerId = req.auth?.userId ?? null;
    const profile = await usersService.getProfile(username, viewerId);
    res.json(ok(profile));
  } catch (e) {
    next(e);
  }
});

export { router as usersRouter };

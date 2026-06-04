import {
  ok,
  profileListQuerySchema,
  profilePostsQuerySchema,
  userIdParamSchema,
  usernameParamSchema,
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

// GET /users — gợi ý danh sách user cho composer/share (yêu cầu auth).
router.get('/', requireAuth, validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { q } = req.query as z.infer<typeof listQuerySchema>;
    const rows = await usersService.listUsersForPicker(req.auth!.userId, q);
    res.json(ok(rows));
  } catch (e) {
    next(e);
  }
});

// GET /users/:username/posts — danh sách bài viết grid (ảnh/video) của user.
router.get(
  '/:username/posts',
  validate(usernameParamSchema, 'params'),
  validate(profilePostsQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { username } = req.params as z.infer<typeof usernameParamSchema>;
      const { items, nextCursor } = await usersService.listProfilePosts(
        username,
        req.query as unknown as ProfilePostsQuery,
      );
      res.json(ok(items, { nextCursor }));
    } catch (e) {
      next(e);
    }
  },
);

// GET /users/:username/likes — bài viết đã thích (chỉ chủ tài khoản).
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

// GET /users/:username/followers — danh sách người đang follow user này.
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

// GET /users/:username/following — danh sách user mà người này đang follow.
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

// POST /users/:id/follow — follow một user (yêu cầu auth).
router.post('/:id/follow', requireAuth, validate(userIdParamSchema, 'params'), async (req, res, next) => {
  try {
    const { id } = req.params as z.infer<typeof userIdParamSchema>;
    const result = await usersService.followUser(req.auth!.userId, id);
    res.json(ok(result));
  } catch (e) {
    next(e);
  }
});

// DELETE /users/:id/follow — hủy follow một user (yêu cầu auth).
router.delete('/:id/follow', requireAuth, validate(userIdParamSchema, 'params'), async (req, res, next) => {
  try {
    const { id } = req.params as z.infer<typeof userIdParamSchema>;
    const result = await usersService.unfollowUser(req.auth!.userId, id);
    res.json(ok(result));
  } catch (e) {
    next(e);
  }
});

// GET /users/:username — profile công khai của một user.
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

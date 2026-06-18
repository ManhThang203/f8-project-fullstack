import {
  friendListQuerySchema,
  friendRequestsQuerySchema,
  friendUserIdParamSchema,
  ok,
  type FriendListQuery,
  type FriendRequestsQuery,
} from '@costy/shared';
import { Router } from 'express';
import type { z } from 'zod';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';

import * as friendsService from './friends.service.js';

const router = Router();

router.use(requireAuth);

/** GET /friends — danh sách bạn bè của mình. */
router.get('/', validate(friendListQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, nextCursor } = await friendsService.listFriends(
      req.auth!.userId,
      req.query as unknown as FriendListQuery,
    );
    res.json(ok(items, { nextCursor }));
  } catch (e) {
    next(e);
  }
});

/** GET /friends/requests?type=incoming|outgoing — lời mời đến / đã gửi. */
router.get('/requests', validate(friendRequestsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, nextCursor } = await friendsService.listFriendRequests(
      req.auth!.userId,
      req.query as unknown as FriendRequestsQuery,
    );
    res.json(ok(items, { nextCursor }));
  } catch (e) {
    next(e);
  }
});

/** POST /friends/:userId/request — gửi lời mời kết bạn. */
router.post(
  '/:userId/request',
  validate(friendUserIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const { userId } = req.params as z.infer<typeof friendUserIdParamSchema>;
      const result = await friendsService.sendFriendRequest(req.auth!.userId, userId);
      res.status(201).json(ok(result));
    } catch (e) {
      next(e);
    }
  },
);

/** DELETE /friends/:userId/request — hủy lời mời mình đã gửi. */
router.delete(
  '/:userId/request',
  validate(friendUserIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const { userId } = req.params as z.infer<typeof friendUserIdParamSchema>;
      const result = await friendsService.cancelFriendRequest(req.auth!.userId, userId);
      res.json(ok(result));
    } catch (e) {
      next(e);
    }
  },
);

/** POST /friends/:userId/accept — chấp nhận lời mời. */
router.post(
  '/:userId/accept',
  validate(friendUserIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const { userId } = req.params as z.infer<typeof friendUserIdParamSchema>;
      const result = await friendsService.acceptFriendRequest(req.auth!.userId, userId);
      res.json(ok(result));
    } catch (e) {
      next(e);
    }
  },
);

/** POST /friends/:userId/reject — từ chối lời mời. */
router.post(
  '/:userId/reject',
  validate(friendUserIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const { userId } = req.params as z.infer<typeof friendUserIdParamSchema>;
      const result = await friendsService.rejectFriendRequest(req.auth!.userId, userId);
      res.json(ok(result));
    } catch (e) {
      next(e);
    }
  },
);

/** DELETE /friends/:userId — hủy kết bạn. */
router.delete('/:userId', validate(friendUserIdParamSchema, 'params'), async (req, res, next) => {
  try {
    const { userId } = req.params as z.infer<typeof friendUserIdParamSchema>;
    const result = await friendsService.unfriend(req.auth!.userId, userId);
    res.json(ok(result));
  } catch (e) {
    next(e);
  }
});

export { router as friendsRouter };

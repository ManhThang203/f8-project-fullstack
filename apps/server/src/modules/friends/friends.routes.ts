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

/**
 * @openapi
 * /friends:
 *   get:
 *     summary: Danh sách bạn bè của mình
 *     tags: [Friends]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CursorQuery'
 *       - $ref: '#/components/parameters/LimitQuery'
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: items + nextCursor
 */
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

/**
 * @openapi
 * /friends/requests:
 *   get:
 *     summary: Lời mời kết bạn đến / đã gửi
 *     tags: [Friends]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CursorQuery'
 *       - $ref: '#/components/parameters/LimitQuery'
 *       - in: query
 *         name: type
 *         required: true
 *         schema: { type: string, enum: [incoming, outgoing] }
 *     responses:
 *       200:
 *         description: items + nextCursor
 */
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

/**
 * @openapi
 * /friends/{userId}/request:
 *   post:
 *     summary: Gửi lời mời kết bạn
 *     tags: [Friends]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Created
 */
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

/**
 * @openapi
 * /friends/{userId}/request:
 *   delete:
 *     summary: Hủy lời mời mình đã gửi
 *     tags: [Friends]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
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

/**
 * @openapi
 * /friends/{userId}/accept:
 *   post:
 *     summary: Chấp nhận lời mời kết bạn
 *     tags: [Friends]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
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

/**
 * @openapi
 * /friends/{userId}/reject:
 *   post:
 *     summary: Từ chối lời mời kết bạn
 *     tags: [Friends]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
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

/**
 * @openapi
 * /friends/{userId}:
 *   delete:
 *     summary: Hủy kết bạn
 *     tags: [Friends]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
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

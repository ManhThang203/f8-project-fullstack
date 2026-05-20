import { ok } from '@threads/shared';
import { Router } from 'express';
import { z } from 'zod';

import { mintSocketToken } from '../../lib/socket-token.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';

import * as chatService from './chat.service.js';

const router = Router();

const messagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  before: z.coerce.number().int().optional(),
});

const peerParamSchema = z.object({
  peerUserId: z.string().min(1),
});

const groupIdParamSchema = z.object({
  groupId: z.coerce.number().int().positive(),
});

const directReadBody = z.object({
  peerUserId: z.string().min(1),
});

const createGroupBody = z.object({
  name: z.string().min(1).max(191),
  memberUserIds: z.array(z.string().min(1)).min(1),
});

/** POST — token handshake cho Socket.io `/chat` khi dev tách cổng (cookie không gửi cross-origin). */
router.post('/socket-token', requireAuth, (req, res) => {
  const token = mintSocketToken(req.auth!.userId);
  res.json(ok({ token }));
});

router.get('/conversations', requireAuth, async (req, res, next) => {
  try {
    const rows = await chatService.listConversationsForUser(req.auth!.userId);
    res.json(ok(rows));
  } catch (e) {
    next(e);
  }
});
// GET — lấy lịch sử chat 1–1.
router.get(
  '/messages/:peerUserId',
  requireAuth,
  validate(peerParamSchema, 'params'),
  validate(messagesQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { peerUserId } = req.params as unknown as z.infer<typeof peerParamSchema>;
      const q = req.query as z.infer<typeof messagesQuerySchema>;
      const messages = await chatService.listChatMessagesBetween(req.auth!.userId, peerUserId, {
        limit: q.limit,
        beforeId: q.before,
      });
      res.json(ok(messages));
    } catch (e) {
      next(e);
    }
  },
);
/** POST — đánh dấu “đã đọc” cuộc trò chuyện 1–1 tới thời điểm hiện tại. */
router.post('/direct/read', requireAuth, validate(directReadBody), async (req, res, next) => {
  try {
    const { peerUserId } = req.body as z.infer<typeof directReadBody>;
    await chatService.markDirectThreadRead(req.auth!.userId, peerUserId);
    res.json(ok({ peerUserId }));
  } catch (e) {
    next(e);
  }
});
// POST — tạo nhóm mới + đẩy creator và các member ban đầu vào `ChatGroupMember`.
router.post('/groups', requireAuth, validate(createGroupBody), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createGroupBody>;
    const group = await chatService.createChatGroup({
      creatorId: req.auth!.userId,
      name: body.name,
      memberUserIds: body.memberUserIds,
    });
    res.status(201).json(ok(group));
  } catch (e) {
    next(e);
  }
});
// GET — lấy lịch sử chat nhóm.
router.get(
  '/groups/:groupId/messages',
  requireAuth,
  validate(groupIdParamSchema, 'params'),
  validate(messagesQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { groupId } = req.params as unknown as z.infer<typeof groupIdParamSchema>;
      const q = req.query as z.infer<typeof messagesQuerySchema>;
      const messages = await chatService.listGroupMessages(req.auth!.userId, groupId, {
        limit: q.limit,
        beforeId: q.before,
      });
      res.json(ok(messages));
    } catch (e) {
      next(e);
    }
  },
);
// POST — đánh dấu “đã đọc” cuộc trò chuyện nhóm tới thời điểm hiện tại.
router.post(
  '/groups/:groupId/read',
  requireAuth,
  validate(groupIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const { groupId } = req.params as unknown as z.infer<typeof groupIdParamSchema>;
      await chatService.markGroupThreadRead(req.auth!.userId, groupId);
      res.json(ok({ groupId }));
    } catch (e) {
      next(e);
    }
  },
);

export { router as chatRouter };

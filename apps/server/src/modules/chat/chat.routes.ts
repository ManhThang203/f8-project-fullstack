import { ok } from '@costy/shared';
import { Router } from 'express';
import { z } from 'zod';

import { mintSocketToken } from '../../lib/socket-token.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';

import * as chatService from './chat.service.js';
import { prisma } from '@costy/db';

const router = Router();

const messagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  before: z.string().optional(),
});

const roomIdParamSchema = z.object({
  roomId: z.string().min(1),
});

const createRoomBody = z.object({
  isGroup: z.boolean().optional(),
  name: z.string().max(191).optional(),
  memberUserIds: z.array(z.string().min(1)).min(1),
  encryptedRoomKeys: z.record(z.string()), // userId -> encrypted AES key
});

const uploadPublicKeyBody = z.object({
  publicKey: z.string().min(1),
});

const getPublicKeysBody = z.object({
  userIds: z.array(z.string()),
});

/** POST — token handshake cho Socket.io `/chat` */
router.post('/socket-token', requireAuth, (req, res) => {
  const token = mintSocketToken(req.auth!.userId);
  res.json(ok({ token }));
});

/** GET — danh sách hội thoại */
router.get('/conversations', requireAuth, async (req, res, next) => {
  try {
    const rows = await chatService.listConversationsForUser(req.auth!.userId);
    res.json(ok(rows));
  } catch (e) {
    next(e);
  }
});

/** GET — lịch sử tin nhắn trong phòng */
router.get(
  '/rooms/:roomId/messages',
  requireAuth,
  validate(roomIdParamSchema, 'params'),
  validate(messagesQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { roomId } = req.params as unknown as z.infer<typeof roomIdParamSchema>;
      const q = req.query as z.infer<typeof messagesQuerySchema>;
      const messages = await chatService.listRoomMessages(req.auth!.userId, roomId, {
        limit: q.limit,
        beforeId: q.before,
      });
      res.json(ok(messages));
    } catch (e) {
      next(e);
    }
  },
);

/** POST — đánh dấu đã đọc phòng */
router.post('/rooms/:roomId/read', requireAuth, validate(roomIdParamSchema, 'params'), async (req, res, next) => {
  try {
    const { roomId } = req.params as unknown as z.infer<typeof roomIdParamSchema>;
    await chatService.markRoomRead(req.auth!.userId, roomId);
    res.json(ok({ roomId }));
  } catch (e) {
    next(e);
  }
});

/** POST — Tạo phòng (kèm mã hóa room key) */
router.post('/rooms', requireAuth, validate(createRoomBody), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createRoomBody>;
    const room = await chatService.createChatRoom({
      creatorId: req.auth!.userId,
      isGroup: body.isGroup,
      name: body.name,
      memberUserIds: body.memberUserIds,
      encryptedRoomKeys: body.encryptedRoomKeys,
    });
    res.status(201).json(ok(room));
  } catch (e) {
    next(e);
  }
});

/** POST — Tải lên Public Key (RSA) của user */
router.post('/keys', requireAuth, validate(uploadPublicKeyBody), async (req, res, next) => {
  try {
    const { publicKey } = req.body as z.infer<typeof uploadPublicKeyBody>;
    await prisma.userPublicKey.upsert({
      where: { userId: req.auth!.userId },
      update: { publicKey },
      create: { userId: req.auth!.userId, publicKey },
    });
    res.json(ok({ success: true }));
  } catch (e) {
    next(e);
  }
});

/** POST — Lấy Public Keys của danh sách user */
router.post('/keys/fetch', requireAuth, validate(getPublicKeysBody), async (req, res, next) => {
  try {
    const { userIds } = req.body as z.infer<typeof getPublicKeysBody>;
    const keys = await chatService.getPublicKeys(userIds);
    res.json(ok(keys));
  } catch (e) {
    next(e);
  }
});

export { router as chatRouter };

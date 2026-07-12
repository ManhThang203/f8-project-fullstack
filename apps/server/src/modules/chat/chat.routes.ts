import { ok } from '@costy/shared';
import { Router } from 'express';
import { z } from 'zod';

import { getRealtimeIo } from '../../lib/realtime.js';
import { mintSocketToken } from '../../lib/socket-token.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';

import * as chatService from './chat.service.js';

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
});

/**
 * @openapi
 * /chat/socket-token:
 *   post:
 *     summary: Token handshake cho Socket.io /chat
 *     tags: [Chat]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: '{ token }'
 */
router.post('/socket-token', requireAuth, (req, res) => {
  const token = mintSocketToken(req.auth!.userId);
  res.json(ok({ token }));
});

/**
 * @openapi
 * /chat/conversations:
 *   get:
 *     summary: Danh sách hội thoại
 *     tags: [Chat]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Danh sách conversation
 */
router.get('/conversations', requireAuth, async (req, res, next) => {
  try {
    const rows = await chatService.listConversationsForUser(req.auth!.userId);
    res.json(ok(rows));
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /chat/rooms/{roomId}/messages:
 *   get:
 *     summary: Lịch sử tin nhắn trong phòng
 *     tags: [Chat]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 200 }
 *       - in: query
 *         name: before
 *         schema: { type: string }
 *         description: Message id — lấy tin nhắn cũ hơn
 *     responses:
 *       200:
 *         description: Danh sách message
 */
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

/**
 * @openapi
 * /chat/rooms/{roomId}/read:
 *   post:
 *     summary: Đánh dấu đã đọc phòng
 *     tags: [Chat]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: '{ roomId }'
 */
router.post(
  '/rooms/:roomId/read',
  requireAuth,
  validate(roomIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const { roomId } = req.params as unknown as z.infer<typeof roomIdParamSchema>;
      await chatService.markRoomRead(req.auth!.userId, roomId);
      res.json(ok({ roomId }));
    } catch (e) {
      next(e);
    }
  },
);

/**
 * @openapi
 * /chat/rooms:
 *   post:
 *     summary: Tạo phòng chat 1-1 hoặc nhóm
 *     tags: [Chat]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateChatRoomBody'
 *     responses:
 *       201:
 *         description: Room đã tạo
 */
router.post('/rooms', requireAuth, validate(createRoomBody), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createRoomBody>;
    const room = await chatService.createChatRoom({
      creatorId: req.auth!.userId,
      isGroup: body.isGroup,
      name: body.name,
      memberUserIds: body.memberUserIds,
    });

    // Báo realtime cho các thành viên khác đang online để họ subscribe phòng mới
    const io = getRealtimeIo();
    if (io) {
      for (const m of room.members) {
        if (m.userId !== req.auth!.userId) {
          io.of('/chat').to(`user:${m.userId}`).emit('room:created', { roomId: room.id });
        }
      }
    }

    res.status(201).json(ok(room));
  } catch (e) {
    next(e);
  }
});

export { router as chatRouter };

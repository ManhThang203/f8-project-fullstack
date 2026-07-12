import { ok } from '@costy/shared';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import * as notificationsService from './notifications.service.js';

const router = Router();

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});

const markReadBodySchema = z.object({
  notificationId: z.string().optional(), // if missing, mark all as read
});

/**
 * @openapi
 * /notifications:
 *   get:
 *     summary: Danh sách thông báo
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CursorQuery'
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Danh sách notification
 */
router.get('/', requireAuth, validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    const q = req.query as z.infer<typeof listQuerySchema>;
    const items = await notificationsService.listNotifications(req.auth!.userId, q.limit, q.cursor);
    res.json(ok(items));
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /notifications/unread-count:
 *   get:
 *     summary: Số thông báo chưa đọc
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: '{ count }'
 */
router.get('/unread-count', requireAuth, async (req, res, next) => {
  try {
    const data = await notificationsService.getUnreadCount(req.auth!.userId);
    res.json(ok(data));
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /notifications/read:
 *   post:
 *     summary: Đánh dấu đã đọc (1 hoặc tất cả)
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notificationId:
 *                 type: string
 *                 description: Nếu bỏ trống → đánh dấu tất cả đã đọc
 *     responses:
 *       200:
 *         description: '{ success true }'
 */
router.post('/read', requireAuth, validate(markReadBodySchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof markReadBodySchema>;
    await notificationsService.markAsRead(req.auth!.userId, body.notificationId);
    res.json(ok({ success: true }));
  } catch (e) {
    next(e);
  }
});

export { router as notificationsRouter };

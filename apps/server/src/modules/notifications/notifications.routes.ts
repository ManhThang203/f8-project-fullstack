import { ok } from '@threads/shared';
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

router.get('/', requireAuth, validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    const q = req.query as z.infer<typeof listQuerySchema>;
    const items = await notificationsService.listNotifications(req.auth!.userId, q.limit, q.cursor);
    res.json(ok(items));
  } catch (e) {
    next(e);
  }
});

router.get('/unread-count', requireAuth, async (req, res, next) => {
  try {
    const data = await notificationsService.getUnreadCount(req.auth!.userId);
    res.json(ok(data));
  } catch (e) {
    next(e);
  }
});

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

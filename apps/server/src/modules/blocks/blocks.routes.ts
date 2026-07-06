import { cursorPageQuerySchema, ok, userIdParamSchema } from '@costy/shared';
import { Router } from 'express';

import { validate } from '../../middleware/validate.middleware.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireActiveAccount } from '../../middleware/auth-context.middleware.js';
import { blockUser, listBlockedUsers, unblockUser } from './blocks.service.js';

export const blocksRouter = Router();

blocksRouter.use(requireAuth, requireActiveAccount);

/** GET /blocks — danh sách user đã chặn. */
blocksRouter.get('/', validate(cursorPageQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { limit, cursor } = req.query as { limit?: number; cursor?: string };
    const { items, nextCursor } = await listBlockedUsers(req.auth!.userId, limit, cursor);
    res.json(ok(items, { nextCursor }));
  } catch (e) {
    next(e);
  }
});

/** POST /blocks/:id — chặn user. */
blocksRouter.post('/:id', validate(userIdParamSchema, 'params'), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const data = await blockUser(req.auth!.userId, id);
    res.status(201).json(ok(data));
  } catch (e) {
    next(e);
  }
});

/** DELETE /blocks/:id — bỏ chặn user. */
blocksRouter.delete('/:id', validate(userIdParamSchema, 'params'), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const data = await unblockUser(req.auth!.userId, id);
    res.json(ok(data));
  } catch (e) {
    next(e);
  }
});

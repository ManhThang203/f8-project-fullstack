import { ok } from '@threads/shared';
import { Router } from 'express';
import { z } from 'zod';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';

import * as usersService from './users.service.js';

const router = Router();

const listQuerySchema = z.object({
  q: z.string().optional(),
});

router.get('/', requireAuth, validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { q } = req.query as z.infer<typeof listQuerySchema>;
    const rows = await usersService.listUsersForPicker(req.auth!.userId, q);
    res.json(ok(rows));
  } catch (e) {
    next(e);
  }
});

export { router as usersRouter };

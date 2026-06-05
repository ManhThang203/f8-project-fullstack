import { Router } from 'express';
import { appealSubmitSchema, ok } from '@costy/shared';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireActiveAccount } from '../../middleware/auth-context.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { getMyModerationCase, submitAppeal } from '../moderation/moderation.service.js';

export const meRouter = Router();

function paramId(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0]! : value!;
}

meRouter.use(requireAuth, requireActiveAccount);

/** GET /me/moderation/cases/:id — User xem chi tiết case kiểm duyệt của mình. */
meRouter.get('/moderation/cases/:id', async (req, res, next) => {
  try {
    const data = await getMyModerationCase(req.auth!.userId, paramId(req.params.id));
    res.json(ok(data));
  } catch (e) {
    next(e);
  }
});

/** POST /me/moderation/cases/:id/appeal — User gửi kháng nghị. */
meRouter.post(
  '/moderation/cases/:id/appeal',
  validate(appealSubmitSchema, 'body'),
  async (req, res, next) => {
    try {
      const data = await submitAppeal(req.auth!.userId, paramId(req.params.id), req.body);
      res.status(201).json(ok(data));
    } catch (e) {
      next(e);
    }
  },
);

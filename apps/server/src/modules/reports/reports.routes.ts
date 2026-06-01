import { Router } from 'express';
import { ok, createReportBodySchema } from '@costy/shared';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireActiveAccount } from '../../middleware/auth-context.middleware.js';
import { createReport } from '../admin/admin-reports.service.js';

export const reportsRouter = Router();

/** User gửi báo cáo nội dung vi phạm. */
reportsRouter.post('/', requireAuth, requireActiveAccount, async (req, res, next) => {
  try {
    const body = createReportBodySchema.parse(req.body);
    const report = await createReport(req.auth!.userId, body);
    res.status(201).json(ok(report));
  } catch (e) {
    next(e);
  }
});

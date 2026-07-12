import { Router } from 'express';
import { ok, createReportBodySchema } from '@costy/shared';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireActiveAccount } from '../../middleware/auth-context.middleware.js';
import { createReport } from '../admin/admin-reports.service.js';

export const reportsRouter = Router();

/**
 * @openapi
 * /reports:
 *   post:
 *     summary: Gửi báo cáo nội dung vi phạm
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateReportBody'
 *     responses:
 *       201:
 *         description: Report đã tạo
 */
reportsRouter.post('/', requireAuth, requireActiveAccount, async (req, res, next) => {
  try {
    const body = createReportBodySchema.parse(req.body);
    const report = await createReport(req.auth!.userId, body);
    res.status(201).json(ok(report));
  } catch (e) {
    next(e);
  }
});

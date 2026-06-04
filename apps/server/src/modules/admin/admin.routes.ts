import { Router } from 'express';
import { ok } from '@costy/shared';
import {
  adminAuditLogQuerySchema,
  adminDateRangeQuerySchema,
  adminHashtagListQuerySchema,
  adminHashtagPatchSchema,
  adminPromoteModeratorSchema,
  adminReportActionSchema,
  adminReportListQuerySchema,
  adminReportReviewSchema,
  adminUserListQuerySchema,
  adminUserPermissionsPutSchema,
  adminUserStatusPatchSchema,
} from '@costy/shared';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireActiveAccount } from '../../middleware/auth-context.middleware.js';
import {
  requireAdminPanelAccess,
  requirePermission,
} from '../../middleware/permission.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';

import { listAuditLogs } from './admin-audit.service.js';
import { listAdminHashtags, patchAdminHashtag } from './admin-hashtags.service.js';
import {
  getMyAdminPermissions,
  getUserPermissions,
  listAllPermissions,
  listModerators,
  promoteToModerator,
  setUserPermissions,
} from './admin-moderators.service.js';
import {
  executeReportAction,
  getAdminReport,
  listAdminReports,
  reviewReport,
} from './admin-reports.service.js';
import {
  getActiveUsersPerDay,
  getPostsPerDay,
  getStatsOverview,
  getTopHashtags,
} from './admin-stats.service.js';
import { getAdminUserDetail, listAdminUsers, patchAdminUserStatus } from './admin-users.service.js';

export const adminRouter = Router();

function paramId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

adminRouter.use(requireAuth, requireActiveAccount, requireAdminPanelAccess);

adminRouter.get('/me/permissions', async (req, res, next) => {
  try {
    const perms = await getMyAdminPermissions(req.auth!.userId);
    res.json(ok({ permissions: perms, role: req.auth!.role }));
  } catch (e) {
    next(e);
  }
});

adminRouter.get(
  '/stats/overview',
  requirePermission('stats:view'),
  validate(adminDateRangeQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { range } = req.query as { range: string };
      const result = await getStatsOverview(range);
      res.json(ok(result.data, result.meta));
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.get(
  '/stats/posts-per-day',
  requirePermission('stats:view'),
  validate(adminDateRangeQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { range } = req.query as { range: string };
      const data = await getPostsPerDay(range);
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.get(
  '/stats/active-users',
  requirePermission('stats:view'),
  validate(adminDateRangeQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { range } = req.query as { range: string };
      const data = await getActiveUsersPerDay(range);
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.get(
  '/stats/top-hashtags',
  requirePermission('stats:view'),
  validate(adminDateRangeQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { range } = req.query as { range: string };
      const data = await getTopHashtags(range);
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.get(
  '/users',
  requirePermission('user:read'),
  validate(adminUserListQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await listAdminUsers(req.query as never);
      res.json(ok(result.items, { nextCursor: result.nextCursor }));
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.get('/users/:id', requirePermission('user:read'), async (req, res, next) => {
  try {
    const data = await getAdminUserDetail(paramId(req.params.id));
    res.json(ok(data));
  } catch (e) {
    next(e);
  }
});

adminRouter.patch(
  '/users/:id/status',
  requirePermission('user:lock'),
  async (req, res, next) => {
    try {
      const body = adminUserStatusPatchSchema.parse(req.body);
      const data = await patchAdminUserStatus(req.auth!.userId, paramId(req.params.id), body);
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.get(
  '/reports',
  requirePermission('report:read'),
  validate(adminReportListQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await listAdminReports(req.query as never);
      res.json(ok(result.items, { nextCursor: result.nextCursor }));
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.get('/reports/:id', requirePermission('report:read'), async (req, res, next) => {
  try {
    const data = await getAdminReport(paramId(req.params.id));
    res.json(ok(data));
  } catch (e) {
    next(e);
  }
});

adminRouter.patch(
  '/reports/:id',
  requirePermission('report:review'),
  async (req, res, next) => {
    try {
      const body = adminReportReviewSchema.parse(req.body);
      const data = await reviewReport(req.auth!.userId, paramId(req.params.id), body);
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.post(
  '/reports/:id/actions',
  requirePermission('report:review'),
  async (req, res, next) => {
    try {
      const body = adminReportActionSchema.parse(req.body);
      const data = await executeReportAction(req.auth!.userId, paramId(req.params.id), body);
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.get(
  '/hashtags',
  requirePermission('hashtag:read'),
  validate(adminHashtagListQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await listAdminHashtags(req.query as never);
      res.json(ok(result.items, { nextCursor: result.nextCursor }));
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.patch(
  '/hashtags/:id',
  requirePermission('hashtag:manage'),
  async (req, res, next) => {
    try {
      const { action } = adminHashtagPatchSchema.parse(req.body);
      const data = await patchAdminHashtag(req.auth!.userId, paramId(req.params.id), action);
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.get('/moderators', requirePermission('moderator:manage'), async (_req, res, next) => {
  try {
    const data = await listModerators();
    res.json(ok(data));
  } catch (e) {
    next(e);
  }
});

adminRouter.post('/moderators', requirePermission('moderator:manage'), async (req, res, next) => {
  try {
    const { userId } = adminPromoteModeratorSchema.parse(req.body);
    const data = await promoteToModerator(req.auth!.userId, userId);
    res.json(ok(data));
  } catch (e) {
    next(e);
  }
});

adminRouter.get('/permissions', requirePermission('permission:grant'), async (_req, res, next) => {
  try {
    const data = await listAllPermissions();
    res.json(ok(data));
  } catch (e) {
    next(e);
  }
});

adminRouter.get(
  '/users/:id/permissions',
  requirePermission('permission:grant'),
  async (req, res, next) => {
    try {
      const data = await getUserPermissions(paramId(req.params.id));
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.put(
  '/users/:id/permissions',
  requirePermission('permission:grant'),
  async (req, res, next) => {
    try {
      const { grants, revokes } = adminUserPermissionsPutSchema.parse(req.body);
      const data = await setUserPermissions(req.auth!.userId, paramId(req.params.id), grants, revokes);
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.get(
  '/audit-logs',
  requirePermission('audit:read'),
  validate(adminAuditLogQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await listAuditLogs(req.query as never);
      res.json(ok(result.items, { nextCursor: result.nextCursor }));
    } catch (e) {
      next(e);
    }
  },
);

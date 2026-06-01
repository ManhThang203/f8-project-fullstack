import type { UserStatus } from '@costy/db';
import type { RequestHandler } from 'express';

import { AppError } from '../lib/errors.js';
import { getAuthContext, isUserBlocked } from '../lib/rbac/permissions.service.js';

/** Nạp role + effective permissions vào req.auth sau khi có userId. */
export const attachAuthContext: RequestHandler = async (req, _res, next) => {
  if (!req.auth?.userId) return next();

  try {
    const ctx = await getAuthContext(req.auth.userId);
    if (!ctx) return next();

    req.auth = {
      userId: ctx.userId,
      role: ctx.role,
      status: ctx.status as UserStatus,
      bannedUntil: ctx.bannedUntil,
      permissions: ctx.permissions,
    };
  } catch {
    /* cache/DB lỗi — giữ userId, guard sẽ xử lý thiếu quyền */
  }
  next();
};

/** Chặn user bị khóa/ban trên mọi API đã xác thực. */
export const blockInactiveUsers: RequestHandler = (req, _res, next) => {
  if (!req.auth?.userId) return next();
  const status = req.auth.status ?? 'ACTIVE';
  const bannedUntil = req.auth.bannedUntil ?? null;
  if (isUserBlocked(status, bannedUntil)) {
    return next(AppError.forbidden('Tài khoản đã bị khóa hoặc cấm'));
  }
  next();
};

/** Chặn user bị khóa/ban trước khi xử lý API (alias cho route cụ thể). */
export const requireActiveAccount = blockInactiveUsers;

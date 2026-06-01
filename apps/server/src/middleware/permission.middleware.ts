import type { Role } from '@costy/shared';
import type { RequestHandler } from 'express';

import { AppError } from '../lib/errors.js';
import { ADMIN_PANEL_ROLES, permissionIncludes } from '../lib/rbac/permission-catalog.js';

/** Yêu cầu một trong các role được chỉ định. */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth?.userId) return next(AppError.unauthorized());
    const role = req.auth.role;
    if (!role || !roles.includes(role)) {
      return next(AppError.forbidden('Không có quyền truy cập'));
    }
    next();
  };
}

/** Yêu cầu quyền cụ thể trong effective permissions. */
export function requirePermission(key: string): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth?.userId) return next(AppError.unauthorized());
    const perms = req.auth.permissions ?? [];
    if (!permissionIncludes(perms, key)) {
      return next(AppError.forbidden('Không có quyền thực hiện thao tác này'));
    }
    next();
  };
}

/** Chỉ cho phép user có role admin panel (MODERATOR+). */
export const requireAdminPanelAccess: RequestHandler = (req, _res, next) => {
  if (!req.auth?.userId) return next(AppError.unauthorized());
  const role = req.auth.role;
  if (!role || !ADMIN_PANEL_ROLES.includes(role)) {
    return next(AppError.forbidden('Chỉ admin/moderator mới truy cập được'));
  }
  next();
};

/** Kết hợp nhiều guard permission (OR). */
export function requireAnyPermission(...keys: string[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth?.userId) return next(AppError.unauthorized());
    const perms = req.auth.permissions ?? [];
    const ok = keys.some((k) => permissionIncludes(perms, k));
    if (!ok) return next(AppError.forbidden('Không có quyền thực hiện thao tác này'));
    next();
  };
}

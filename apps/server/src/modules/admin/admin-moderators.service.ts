import { prisma } from '@costy/db';
import type { AdminModeratorDto, AdminPermissionDto, Role } from '@costy/shared';

import { writeAuditLog } from '../../lib/admin/audit.service.js';
import { AppError } from '../../lib/errors.js';
import { ROLE_DEFAULT_PERMISSIONS } from '../../lib/rbac/permission-catalog.js';
import {
  invalidateUserPermissionCache,
  resolveEffectivePermissions,
} from '../../lib/rbac/permissions.service.js';

/** Danh sách moderator/admin trong hệ thống. */
export async function listModerators(): Promise<AdminModeratorDto[]> {
  const users = await prisma.user.findMany({
    where: { role: { in: ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'] }, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      userPermissions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { grantedBy: { select: { id: true, username: true } } },
      },
    },
  });

  return Promise.all(
    users.map(async (u) => {
      const perms = await resolveEffectivePermissions(u.id, u.role);
      const latest = u.userPermissions[0];
      return {
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role as Role,
        permissionCount: perms.includes('*') ? 999 : perms.length,
        grantedAt: latest?.createdAt.toISOString() ?? null,
        grantedBy: latest?.grantedBy ?? null,
      };
    }),
  );
}

/** Promote user thường lên MODERATOR. */
export async function promoteToModerator(actorId: string, userId: string): Promise<AdminModeratorDto> {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) throw AppError.notFound('Không tìm thấy user');
  if (user.role !== 'USER') throw AppError.badRequest('User đã có role admin/moderator');

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role: 'MODERATOR' },
  });

  await invalidateUserPermissionCache(userId);
  await writeAuditLog({
    actorId,
    action: 'MODERATOR_PROMOTE',
    targetType: 'USER',
    targetId: userId,
  });

  const perms = await resolveEffectivePermissions(updated.id, updated.role);
  return {
    id: updated.id,
    username: updated.username,
    name: updated.name,
    role: updated.role as Role,
    permissionCount: perms.length,
    grantedAt: new Date().toISOString(),
    grantedBy: { id: actorId, username: '' },
  };
}

/** Lấy danh sách permission kèm trạng thái của user. */
export async function getUserPermissions(userId: string): Promise<AdminPermissionDto[]> {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) throw AppError.notFound('Không tìm thấy user');

  const all = await prisma.permission.findMany({ orderBy: [{ domain: 'asc' }, { key: 'asc' }] });
  const defaults = new Set(ROLE_DEFAULT_PERMISSIONS[user.role as Role] ?? []);
  const overrides = await prisma.userPermission.findMany({
    where: { userId },
    include: { permission: true },
  });
  const overrideMap = new Map(overrides.map((o) => [o.permission.key, o.effect]));

  return all.map((p) => ({
    id: p.id,
    key: p.key,
    domain: p.domain,
    label: p.label,
    isDefaultForRole: defaults.has(p.key) || defaults.has('*'),
    effect: (overrideMap.get(p.key) as 'GRANT' | 'REVOKE' | undefined) ?? null,
  }));
}

/** Cấp/thu quyền riêng cho user. */
export async function setUserPermissions(
  actorId: string,
  userId: string,
  grants: string[],
  revokes: string[],
): Promise<AdminPermissionDto[]> {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) throw AppError.notFound('Không tìm thấy user');
  if (user.role === 'SUPER_ADMIN') throw AppError.forbidden('Không thể sửa quyền super admin');

  const allKeys = [...new Set([...grants, ...revokes])];
  const perms = await prisma.permission.findMany({ where: { key: { in: allKeys } } });
  const permMap = new Map(perms.map((p) => [p.key, p.id]));

  await prisma.$transaction(async (tx) => {
    for (const key of grants) {
      const permissionId = permMap.get(key);
      if (!permissionId) continue;
      await tx.userPermission.upsert({
        where: { userId_permissionId: { userId, permissionId } },
        create: { userId, permissionId, effect: 'GRANT', grantedById: actorId },
        update: { effect: 'GRANT', grantedById: actorId },
      });
    }
    for (const key of revokes) {
      const permissionId = permMap.get(key);
      if (!permissionId) continue;
      await tx.userPermission.upsert({
        where: { userId_permissionId: { userId, permissionId } },
        create: { userId, permissionId, effect: 'REVOKE', grantedById: actorId },
        update: { effect: 'REVOKE', grantedById: actorId },
      });
    }
  });

  await invalidateUserPermissionCache(userId);
  await writeAuditLog({
    actorId,
    action: 'PERMISSIONS_UPDATE',
    targetType: 'USER',
    targetId: userId,
    metadata: { grants, revokes },
  });

  return getUserPermissions(userId);
}

/** Catalog permission toàn hệ thống. */
export async function listAllPermissions(): Promise<AdminPermissionDto[]> {
  const all = await prisma.permission.findMany({ orderBy: [{ domain: 'asc' }, { key: 'asc' }] });
  return all.map((p) => ({
    id: p.id,
    key: p.key,
    domain: p.domain,
    label: p.label,
    isDefaultForRole: false,
    effect: null,
  }));
}

/** Lấy quyền hiệu lực của user đang đăng nhập (cho admin UI). */
export async function getMyAdminPermissions(userId: string): Promise<string[]> {
  const ctx = await prisma.user.findFirst({
    where: { id: userId },
    select: { role: true },
  });
  if (!ctx) return [];
  return resolveEffectivePermissions(userId, ctx.role);
}

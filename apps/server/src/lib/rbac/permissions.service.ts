import { prisma, type Role } from '@costy/db';

import { redis } from '../redis.js';
import {
  hasWildcardRole,
  PERMISSION_CATALOG,
  ROLE_DEFAULT_PERMISSIONS,
} from './permission-catalog.js';

const PERM_CACHE_PREFIX = 'perm:';
const PERM_CACHE_TTL_SEC = 300;
const PERM_VERSION_KEY = 'perm:version';

export type AuthContext = {
  userId: string;
  role: Role;
  status: string;
  bannedUntil: Date | null;
  permissions: string[];
};

/** Tính quyền hiệu lực: role defaults ∪ grants − revokes. */
export async function resolveEffectivePermissions(userId: string, role: Role): Promise<string[]> {
  if (hasWildcardRole(role)) return ['*'];

  const rolePerms = await prisma.rolePermission.findMany({
    where: { role },
    include: { permission: { select: { key: true } } },
  });
  const defaults = new Set(rolePerms.map((rp) => rp.permission.key));

  const overrides = await prisma.userPermission.findMany({
    where: { userId },
    include: { permission: { select: { key: true } } },
  });

  for (const o of overrides) {
    if (o.effect === 'GRANT') defaults.add(o.permission.key);
    if (o.effect === 'REVOKE') defaults.delete(o.permission.key);
  }

  return [...defaults];
}

/** Tính quyền hiệu lực cho nhiều user cùng lúc (batch) — tránh N+1 khi liệt kê moderator. */
export async function resolveEffectivePermissionsBatch(
  users: { id: string; role: Role }[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (users.length === 0) return result;

  const normalUsers: { id: string; role: Role }[] = [];
  for (const u of users) {
    if (hasWildcardRole(u.role)) result.set(u.id, ['*']);
    else normalUsers.push(u);
  }
  if (normalUsers.length === 0) return result;

  const roles = [...new Set(normalUsers.map((u) => u.role))];
  const rolePerms = await prisma.rolePermission.findMany({
    where: { role: { in: roles } },
    include: { permission: { select: { key: true } } },
  });
  const roleDefaults = new Map<Role, Set<string>>();
  for (const rp of rolePerms) {
    const set = roleDefaults.get(rp.role) ?? new Set<string>();
    set.add(rp.permission.key);
    roleDefaults.set(rp.role, set);
  }

  const overrides = await prisma.userPermission.findMany({
    where: { userId: { in: normalUsers.map((u) => u.id) } },
    include: { permission: { select: { key: true } } },
  });
  const overridesByUser = new Map<string, typeof overrides>();
  for (const o of overrides) {
    const list = overridesByUser.get(o.userId) ?? [];
    list.push(o);
    overridesByUser.set(o.userId, list);
  }

  for (const u of normalUsers) {
    const perms = new Set(roleDefaults.get(u.role) ?? []);
    for (const o of overridesByUser.get(u.id) ?? []) {
      if (o.effect === 'GRANT') perms.add(o.permission.key);
      if (o.effect === 'REVOKE') perms.delete(o.permission.key);
    }
    result.set(u.id, [...perms]);
  }

  return result;
}

/** Đọc auth context từ cache Redis hoặc DB. */
export async function getAuthContext(userId: string): Promise<AuthContext | null> {
  const cacheKey = `${PERM_CACHE_PREFIX}${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as AuthContext & { bannedUntil: string | null };
      return {
        ...parsed,
        bannedUntil: parsed.bannedUntil ? new Date(parsed.bannedUntil) : null,
      };
    } catch {
      await redis.del(cacheKey);
    }
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, role: true, status: true, bannedUntil: true },
  });
  if (!user) return null;

  const permissions = await resolveEffectivePermissions(user.id, user.role);
  const ctx: AuthContext = {
    userId: user.id,
    role: user.role,
    status: user.status,
    bannedUntil: user.bannedUntil,
    permissions,
  };

  await redis.setex(
    cacheKey,
    PERM_CACHE_TTL_SEC,
    JSON.stringify({ ...ctx, bannedUntil: ctx.bannedUntil?.toISOString() ?? null }),
  );

  return ctx;
}

/** Xóa cache quyền của một user sau khi đổi role/permission/status. */
export async function invalidateUserPermissionCache(userId: string): Promise<void> {
  await redis.del(`${PERM_CACHE_PREFIX}${userId}`);
}

/** Vô hiệu cache quyền toàn hệ thống khi đổi RolePermission. */
export async function invalidateAllPermissionCaches(): Promise<void> {
  await redis.incr(PERM_VERSION_KEY);
  const keys = await redis.keys(`${PERM_CACHE_PREFIX}*`);
  if (keys.length > 0) await redis.del(...keys);
}

/** Seed catalog quyền và role defaults vào DB. */
export async function seedPermissionCatalog(): Promise<void> {
  for (const def of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { key: def.key },
      create: def,
      update: { domain: def.domain, label: def.label },
    });
  }

  for (const [role, keys] of Object.entries(ROLE_DEFAULT_PERMISSIONS) as [Role, string[]][]) {
    if (keys.includes('*')) continue;
    for (const key of keys) {
      const perm = await prisma.permission.findUnique({ where: { key } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role, permissionId: perm.id } },
        create: { role, permissionId: perm.id },
        update: {},
      });
    }
  }
}

/** Revoke tất cả session Better Auth của user (khóa/ban). */
export async function revokeUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

/** Kiểm tra user có đang bị khóa/ban không. */
export function isUserBlocked(status: string, bannedUntil: Date | null): boolean {
  if (status === 'LOCKED') return true;
  if (status !== 'BANNED') return false;
  if (!bannedUntil) return true;
  return bannedUntil.getTime() > Date.now();
}

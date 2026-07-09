import { prisma, type Prisma } from '@costy/db';
import type {
  AdminUserDetailDto,
  AdminUserListItemDto,
  AdminUserRolePatch,
  AdminUserStatusPatch,
} from '@costy/shared';

import { writeAuditLog } from '../../lib/admin/audit.service.js';
import {
  createdCursorOrderBy,
  createdCursorWhere,
  encodeCreatedCursor,
} from '../../lib/admin/cursor.js';
import { AppError } from '../../lib/errors.js';
import {
  getAuthContext,
  invalidateUserPermissionCache,
  revokeUserSessions,
} from '../../lib/rbac/permissions.service.js';

import { invalidateStatsCache } from './admin-stats.service.js';

/** Include đếm số bài viết gốc (không tính comment, chưa xóa) — dùng chung cho mọi query user. */
const postsCountInclude = {
  _count: { select: { posts: { where: { deletedAt: null, parentId: null } } } },
} satisfies Prisma.UserInclude;

function mapUserRow(u: {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  status: string;
  bannedUntil: Date | null;
  statusReason: string | null;
  createdAt: Date;
  _count?: { posts: number };
}): AdminUserListItemDto {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    email: u.email,
    image: u.image,
    role: u.role as AdminUserListItemDto['role'],
    status: u.status as AdminUserListItemDto['status'],
    bannedUntil: u.bannedUntil?.toISOString() ?? null,
    statusReason: u.statusReason,
    createdAt: u.createdAt.toISOString(),
    postCount: u._count?.posts ?? 0,
  };
}

/** Danh sách user cho admin, phân trang cursor. */
export async function listAdminUsers(query: {
  cursor?: string;
  limit: number;
  q?: string;
  status?: string;
  role?: string;
}): Promise<{ items: AdminUserListItemDto[]; nextCursor: string | null }> {
  // +1 để kiểm tra có phần tiếp theo không
  const take = query.limit + 1;
  // Gói bằng AND để tránh đụng hai key OR (search + cursor)
  const and: Prisma.UserWhereInput[] = [
    { deletedAt: null },
    ...(query.status ? [{ status: query.status as 'ACTIVE' | 'LOCKED' | 'BANNED' }] : []),
    ...(query.role ? [{ role: query.role as 'USER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN' }] : []),
    ...(query.q
      ? [
          {
            OR: [
              { username: { contains: query.q, mode: 'insensitive' as const } },
              { email: { contains: query.q, mode: 'insensitive' as const } },
              { name: { contains: query.q, mode: 'insensitive' as const } },
            ],
          },
        ]
      : []),
  ];
  const cursorWhere = createdCursorWhere(query.cursor);
  if (cursorWhere) and.push(cursorWhere);

  const rows = await prisma.user.findMany({
    where: { AND: and },
    orderBy: createdCursorOrderBy,
    take,
    include: postsCountInclude,
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const nextCursor =
    hasMore && page.length ? encodeCreatedCursor(page[page.length - 1]!) : null;

  return { items: page.map(mapUserRow), nextCursor };
}

/** Chi tiết user + quyền hiệu lực. */
export async function getAdminUserDetail(userId: string): Promise<AdminUserDetailDto> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: postsCountInclude,
  });
  if (!user) throw AppError.notFound('Không tìm thấy user');

  const ctx = await getAuthContext(userId);
  return {
    ...mapUserRow(user),
    permissions: ctx?.permissions ?? [],
  };
}

/** Cập nhật trạng thái user: khóa/ban/mở. */
export async function patchAdminUserStatus(
  actorId: string,
  userId: string,
  body: AdminUserStatusPatch,
): Promise<AdminUserListItemDto> {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) throw AppError.notFound('Không tìm thấy user');
  if (user.role === 'SUPER_ADMIN') {
    throw AppError.forbidden('Không thể thay đổi trạng thái super admin');
  }

  let status = user.status;
  let bannedUntil: Date | null = user.bannedUntil;

  switch (body.action) {
    case 'lock':
      status = 'LOCKED';
      bannedUntil = null;
      break;
    case 'unlock':
      status = 'ACTIVE';
      bannedUntil = null;
      break;
    case 'ban_temp':
      status = 'BANNED';
      bannedUntil = body.bannedUntil
        ? new Date(body.bannedUntil)
        : new Date(Date.now() + 7 * 86400000);
      break;
    case 'ban_perm':
      status = 'BANNED';
      bannedUntil = null;
      break;
    case 'unban':
      status = 'ACTIVE';
      bannedUntil = null;
      break;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status, bannedUntil, statusReason: body.reason },
    include: postsCountInclude,
  });

  await invalidateStatsCache();
  await invalidateUserPermissionCache(userId);
  if (status !== 'ACTIVE') await revokeUserSessions(userId);

  await writeAuditLog({
    actorId,
    action: `USER_${body.action.toUpperCase()}`,
    targetType: 'USER',
    targetId: userId,
    metadata: { reason: body.reason, status, bannedUntil: bannedUntil?.toISOString() ?? null },
  });

  return mapUserRow(updated);
}

/** Đổi role user (USER / MODERATOR / ADMIN), invalidate cache quyền và ghi audit. */
export async function patchAdminUserRole(
  actorId: string,
  userId: string,
  body: AdminUserRolePatch,
): Promise<AdminUserListItemDto> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: postsCountInclude,
  });
  if (!user) throw AppError.notFound('Không tìm thấy user');
  if (user.role === 'SUPER_ADMIN') {
    throw AppError.forbidden('Không thể thay đổi role super admin');
  }
  if (actorId === userId) {
    throw AppError.forbidden('Không thể tự đổi role của chính mình');
  }
  // Chỉ SUPER_ADMIN mới được cấp mới hoặc thu hồi quyền ADMIN, tránh leo thang đặc quyền
  // từ moderator:manage (vốn chỉ để quản lý moderator).
  if (body.role === 'ADMIN' || user.role === 'ADMIN') {
    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { role: true },
    });
    if (actor?.role !== 'SUPER_ADMIN') {
      throw AppError.forbidden('Chỉ super admin mới được thay đổi quyền ADMIN');
    }
  }
  if (user.role === body.role) {
    return mapUserRow(user);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role: body.role },
    include: postsCountInclude,
  });

  await invalidateUserPermissionCache(userId);
  await writeAuditLog({
    actorId,
    action: 'USER_ROLE_CHANGE',
    targetType: 'USER',
    targetId: userId,
    metadata: { from: user.role, to: body.role, reason: body.reason ?? null },
  });

  return mapUserRow(updated);
}

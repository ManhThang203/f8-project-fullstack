import type { AdminUserListItemDto, Role } from '@costy/shared';

/**
 * Không cho đổi role SUPER_ADMIN, tự đổi role của mình,
 * hoặc đổi role ADMIN khi actor không phải SUPER_ADMIN.
 */
export function isRoleChangeDisabled(
  user: AdminUserListItemDto,
  currentUserId?: string,
  currentUserRole?: Role,
): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  if (currentUserId !== undefined && user.id === currentUserId) return true;
  if (user.role === 'ADMIN' && currentUserRole !== 'SUPER_ADMIN') return true;
  return false;
}

/**
 * Không cho đổi trạng thái SUPER_ADMIN, tự đổi status của mình,
 * hoặc đổi status ADMIN khi actor không phải SUPER_ADMIN.
 */
export function isStatusChangeDisabled(
  user: AdminUserListItemDto,
  currentUserId?: string,
  currentUserRole?: Role,
): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  if (currentUserId !== undefined && user.id === currentUserId) return true;
  if (user.role === 'ADMIN' && currentUserRole !== 'SUPER_ADMIN') return true;
  return false;
}

/**
 * Không cho BAN_ACCOUNT trên report khi target là SUPER_ADMIN,
 * hoặc ADMIN mà actor không phải SUPER_ADMIN.
 */
export function isBanTargetDisabled(
  targetRole: Role | string | null | undefined,
  currentUserRole?: Role,
): boolean {
  if (!targetRole) return false;
  if (targetRole === 'SUPER_ADMIN') return true;
  if (targetRole === 'ADMIN' && currentUserRole !== 'SUPER_ADMIN') return true;
  return false;
}

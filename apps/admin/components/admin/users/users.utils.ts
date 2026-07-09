import type { AdminUserListItemDto } from '@costy/shared';

/**
 * Không cho đổi role SUPER_ADMIN và không cho tự đổi role của chính mình.
 * Dùng chung cho bảng (desktop) và card list (mobile).
 */
export function isRoleChangeDisabled(
  user: AdminUserListItemDto,
  currentUserId?: string,
): boolean {
  return user.role === 'SUPER_ADMIN' || (currentUserId !== undefined && user.id === currentUserId);
}

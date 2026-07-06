/** Kiểm tra admin có quyền cụ thể (hoặc wildcard *). */
export function hasAdminPermission(permissions: string[], key: string): boolean {
  return permissions.includes('*') || permissions.includes(key);
}

/** Map route admin → permission tối thiểu để vào trang. */
export const ADMIN_ROUTE_PERMISSION: Record<string, string> = {
  '/users': 'user:read',
  '/reports': 'report:read',
  '/hashtags': 'hashtag:read',
  '/moderators': 'moderator:manage',
  '/audit': 'audit:read',
};

/** Lấy permission bắt buộc cho pathname (hỗ trợ prefix như /reports/123). */
export function getRequiredPermissionForPath(pathname: string): string | null {
  if (pathname === '/') return 'stats:view';
  for (const [route, permission] of Object.entries(ADMIN_ROUTE_PERMISSION)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) return permission;
  }
  return null;
}

import type { Role } from '@costy/shared';

export type PermissionDef = {
  key: string;
  domain: string;
  label: string;
};

/** Danh mục quyền cố định của hệ thống. */
export const PERMISSION_CATALOG: PermissionDef[] = [
  { key: 'post:create', domain: 'post', label: 'Tạo bài viết' },
  { key: 'post:delete:own', domain: 'post', label: 'Xóa bài của mình' },
  { key: 'post:react', domain: 'post', label: 'React bài viết' },
  { key: 'comment:create', domain: 'post', label: 'Bình luận' },
  { key: 'follow', domain: 'user', label: 'Follow user' },
  { key: 'chat', domain: 'chat', label: 'Chat' },
  { key: 'profile:edit:own', domain: 'user', label: 'Sửa profile của mình' },
  { key: 'report:create', domain: 'report', label: 'Gửi báo cáo' },
  { key: 'stats:view', domain: 'stats', label: 'Xem thống kê admin' },
  { key: 'report:read', domain: 'report', label: 'Xem báo cáo' },
  { key: 'report:review', domain: 'report', label: 'Duyệt báo cáo' },
  { key: 'post:hide', domain: 'post', label: 'Ẩn bài vi phạm' },
  { key: 'post:delete:any', domain: 'post', label: 'Xóa bất kỳ bài nào' },
  { key: 'user:read', domain: 'user', label: 'Xem danh sách user' },
  { key: 'user:lock', domain: 'user', label: 'Khóa/mở khóa user' },
  { key: 'user:ban:temp', domain: 'user', label: 'Ban tạm thời' },
  { key: 'user:ban', domain: 'user', label: 'Ban vĩnh viễn' },
  { key: 'user:unlock', domain: 'user', label: 'Bỏ ban user' },
  { key: 'hashtag:read', domain: 'hashtag', label: 'Xem hashtag trending' },
  { key: 'hashtag:manage', domain: 'hashtag', label: 'Quản lý hashtag' },
  { key: 'moderator:manage', domain: 'admin', label: 'Quản lý moderator' },
  { key: 'permission:grant', domain: 'admin', label: 'Cấp/thu quyền' },
  { key: 'audit:read', domain: 'admin', label: 'Xem audit log' },
];

/** Quyền mặc định theo role (MODERATOR trở lên; USER dùng app permissions riêng). */
export const ROLE_DEFAULT_PERMISSIONS: Record<Role, string[]> = {
  USER: [
    'post:create',
    'post:delete:own',
    'post:react',
    'comment:create',
    'follow',
    'chat',
    'profile:edit:own',
    'report:create',
  ],
  MODERATOR: [
    'post:create',
    'post:delete:own',
    'post:react',
    'comment:create',
    'follow',
    'chat',
    'profile:edit:own',
    'report:create',
    'stats:view',
    'report:read',
    'report:review',
    'post:hide',
  ],
  ADMIN: ['*'],
  SUPER_ADMIN: ['*'],
};

export const ADMIN_PANEL_ROLES: Role[] = ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'];

/** Kiểm tra role có wildcard toàn quyền không. */
export function hasWildcardRole(role: Role): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

/** Kiểm tra user có quyền cụ thể trong tập effective permissions. */
export function permissionIncludes(permissions: string[], key: string): boolean {
  if (permissions.includes('*')) return true;
  return permissions.includes(key);
}

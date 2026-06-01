'use client';

import type { ReactNode } from 'react';

type Props = {
  permission: string;
  permissions: string[];
  children: ReactNode;
  fallback?: ReactNode;
};

/** Ẩn/hiện UI theo quyền effective của user admin. */
export function PermissionGate({ permission, permissions, children, fallback = null }: Props) {
  const allowed = permissions.includes('*') || permissions.includes(permission);
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}

'use client';

import { authClient } from '@/lib/auth-client';

/**
 * Gọi Better Auth `get-session` (cùng nguồn với `useSession`).
 * Dùng sau đăng nhập / khi cần lấy user ngoài hook.
 */
export async function getCurrentUser() {
  const { data, error } = await authClient.getSession();
  if (error) return null;
  return data?.user ?? null;
}

export async function getCurrentSession() {
  return authClient.getSession();
}

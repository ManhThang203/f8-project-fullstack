'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { ServerAuthUser } from '@/lib/auth-user.types';

const CurrentUserContext = createContext<ServerAuthUser | null>(null);

/**
 * Cung cấp user từ session SSR (initialUser) cho các component con nằm sâu trong cây,
 * tránh việc chỉ dựa vào `authClient.useSession()` (chưa hydrate xong ở lần render đầu)
 * khiến người dùng đã đăng nhập vẫn bị coi là khách.
 */
export function CurrentUserProvider({
  value,
  children,
}: {
  value: ServerAuthUser | null;
  children: ReactNode;
}) {
  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

/** Lấy user từ session SSR ban đầu; trả null nếu gọi ngoài CurrentUserProvider. */
export function useInitialUser(): ServerAuthUser | null {
  return useContext(CurrentUserContext);
}

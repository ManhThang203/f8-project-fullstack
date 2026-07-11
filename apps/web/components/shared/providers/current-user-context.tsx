'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { useAvatarOverride } from '@/hooks/ui';
import { authClient, type ServerAuthUser } from '@/lib/auth';

type CurrentUserContextValue = {
  user: ServerAuthUser | null;
  isAuthed: boolean;
};

const CurrentUserContext = createContext<CurrentUserContextValue>({
  user: null,
  isAuthed: false,
});

/** Chuẩn hóa user từ Better Auth client hoặc SSR sang ServerAuthUser. */
function normalizeAuthUser(
  u:
    | {
        id: string;
        email?: string | null;
        username?: string | null;
        name?: string | null;
        image?: string | null;
      }
    | null
    | undefined,
): ServerAuthUser | null {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email ?? null,
    username: u.username ?? null,
    name: u.name ?? null,
    image: u.image ?? null,
  };
}

/**
 * Gọi `useSession` một lần ở layout, merge SSR + client để các component con
 * không tự subscribe session (tránh burst `get-session` khi list/virtualize).
 * Avatar vừa upload được merge qua event cho đến khi cookieCache bắt kịp.
 */
export function CurrentUserProvider({
  initialUser,
  children,
}: {
  initialUser: ServerAuthUser | null;
  children: ReactNode;
}) {
  const { data: session } = authClient.useSession();
  const sessionImage = (session?.user as { image?: string | null } | undefined)?.image;
  const avatarOverride = useAvatarOverride(sessionImage);

  const value = useMemo<CurrentUserContextValue>(() => {
    const fromClient = normalizeAuthUser(session?.user);
    const fromServer = normalizeAuthUser(initialUser);
    const base = fromClient ?? fromServer ?? null;
    const user = base ? { ...base, image: avatarOverride ?? base.image } : null;
    return { user, isAuthed: Boolean(user) };
  }, [session?.user, initialUser, avatarOverride]);

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

/** Lấy user hiện tại (SSR + client session đã merge) và cờ đăng nhập. */
export function useCurrentUser() {
  return useContext(CurrentUserContext);
}

/** Lấy user từ context; tương thích code cũ dùng `useInitialUser`. */
export function useInitialUser(): ServerAuthUser | null {
  return useCurrentUser().user;
}

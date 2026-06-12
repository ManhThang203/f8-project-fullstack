'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { SiteHeaderCompact } from './site-header-compact';
import { SiteHeaderDesktop } from './site-header-desktop';

import { authClient } from '@/lib/auth-client';
import type { ServerAuthUser } from '@/lib/auth-user.types';
import { resetChatSocket } from '@/lib/chat-socket';
import { subscribeAvatarUpdated } from '@/lib/profile-image-sync';

type Props = {
  /** Session đọc trên server từ cookie + Express (đồng bộ với middleware). */
  initialUser: ServerAuthUser | null;
};

function normalizeUser(
  u: { id: string; username?: string | null; name?: string | null; image?: string | null } | null | undefined,
) {
  if (!u) return null;
  return {
    id: u.id,
    username: (u as { username?: string | null }).username ?? '',
    name: u.name ?? null,
    image: (u as { image?: string | null }).image ?? null,
  };
}

export function SiteHeader({ initialUser }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, refetch } = authClient.useSession();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null);
  /** Ngay sau signOut: hiện nav khách, không chờ RSC / nano store bắt kịp. */
  const [forceGuestNav, setForceGuestNav] = useState(false);
  const chatUnreadTotal = 0; // TODO: fetch unread from query

  useEffect(() => {
    void refetch();
  }, [pathname, refetch]);

  useEffect(() => subscribeAvatarUpdated(setAvatarOverride), []);

  useEffect(() => {
    const sessionImage = (session?.user as { image?: string | null } | undefined)?.image;
    if (sessionImage) setAvatarOverride(null);
  }, [session?.user]);

  useEffect(() => {
    if (!forceGuestNav) return;
    if (!session?.user && initialUser === null) {
      setForceGuestNav(false);
    }
  }, [forceGuestNav, session?.user, initialUser]);

  const me = useMemo(() => {
    if (forceGuestNav) return null;
    const fromClient = normalizeUser(session?.user);
    const fromServer = normalizeUser(initialUser);
    return fromClient ?? fromServer ?? null;
  }, [forceGuestNav, session?.user, initialUser]);

  const accountUser = useMemo(() => {
    if (!me) return null;
    return { ...me, image: avatarOverride ?? me.image };
  }, [me, avatarOverride]);

  async function onLogout() {
    setLogoutError(null);
    setLoggingOut(true);
    setForceGuestNav(true);
    try {
      const result = (await authClient.signOut()) as
        | { error?: { message?: string } | null }
        | undefined;
      const err = result && typeof result === 'object' && 'error' in result ? result.error : null;
      if (err) {
        setForceGuestNav(false);
        setLogoutError(
          typeof err === 'object' && err !== null && typeof err.message === 'string'
            ? err.message
            : 'Đăng xuất thất bại. Thử lại.',
        );
        return;
      }
      resetChatSocket();
      await refetch();
      router.refresh();
    } catch {
      setForceGuestNav(false);
      setLogoutError('Đăng xuất thất bại. Thử lại.');
    } finally {
      setLoggingOut(false);
    }
  }

  const sharedProps = {
    me,
    accountUser,
    loggingOut,
    onLogout: () => void onLogout(),
  };

  return (
    <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-50 border-b backdrop-blur-sm">
      <SiteHeaderDesktop
        className="hidden w-full lg:flex"
        pathname={pathname}
        chatUnreadTotal={chatUnreadTotal}
        {...sharedProps}
      />
      <SiteHeaderCompact className="w-full lg:hidden" pathname={pathname} {...sharedProps} />
      {logoutError ? (
        <p
          className="border-border bg-background border-t px-4 py-2 text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {logoutError}
        </p>
      ) : null}
    </header>
  );
}

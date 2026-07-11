'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { SiteHeaderCompact } from './site-header-compact';
import { SiteHeaderDesktop } from './site-header-desktop';

import { useChatUnreadSync, useChatUnreadTotal } from '@/hooks/queries/chat';
import { authClient, getAuthClientErrorMessage, type ServerAuthUser } from '@/lib/auth';
import { subscribeAvatarUpdated } from '@/lib/events';
import { resetChatSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';

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
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null);
  /** Ngay sau signOut: hiện nav khách, không chờ RSC / nano store bắt kịp. */
  const [forceGuestNav, setForceGuestNav] = useState(false);

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

  useChatUnreadSync(Boolean(me));
  const chatUnreadTotal = useChatUnreadTotal(Boolean(me));

  async function onLogout() {
    setLoggingOut(true);
    setForceGuestNav(true);
    try {
      const result = (await authClient.signOut()) as
        | { error?: { message?: string } | null }
        | undefined;
      const err = result && typeof result === 'object' && 'error' in result ? result.error : null;
      if (err) {
        setForceGuestNav(false);
        toast.error(getAuthClientErrorMessage(err, 'Đăng xuất thất bại, vui lòng thử lại.'));
        return;
      }
      resetChatSocket();
      await refetch();
      if (pathname !== '/') {
        router.replace('/');
      }
      router.refresh();
    } catch {
      setForceGuestNav(false);
      toast.error('Đăng xuất thất bại, vui lòng thử lại.');
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

  const hideOnMobileTablet = pathname.startsWith('/reel');

  return (
    <header
      className={cn(
        'border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-50 border-b backdrop-blur-sm',
        hideOnMobileTablet && 'hidden lg:block',
      )}
    >
      <SiteHeaderDesktop
        className="hidden w-full lg:flex"
        pathname={pathname}
        chatUnreadTotal={chatUnreadTotal}
        {...sharedProps}
      />
      <SiteHeaderCompact className="w-full lg:hidden" pathname={pathname} {...sharedProps} />
    </header>
  );
}

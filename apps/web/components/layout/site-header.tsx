'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { SiteHeaderCompact } from './site-header-compact';
import { SiteHeaderDesktop } from './site-header-desktop';

import { useCurrentUser } from '@/components/shared/providers/current-user-context';
import { useChatUnreadSync, useChatUnreadTotal } from '@/hooks/queries/chat';
import { authClient, getAuthClientErrorMessage, type ServerAuthUser } from '@/lib/auth';
import { resetChatSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';

type Props = {
  /** Session đọc trên server từ cookie + Express (đồng bộ với middleware). */
  initialUser: ServerAuthUser | null;
};

export function SiteHeader({ initialUser }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, refetch } = authClient.useSession();
  const { user: currentUser } = useCurrentUser();
  const [loggingOut, setLoggingOut] = useState(false);
  /** Ngay sau signOut: hiện nav khách, không chờ RSC / nano store bắt kịp. */
  const [forceGuestNav, setForceGuestNav] = useState(false);

  useEffect(() => {
    if (!forceGuestNav) return;
    if (!session?.user && initialUser === null) {
      setForceGuestNav(false);
    }
  }, [forceGuestNav, session?.user, initialUser]);

  const me = useMemo(() => {
    if (forceGuestNav || !currentUser) return null;
    return {
      id: currentUser.id,
      username: currentUser.username ?? '',
      name: currentUser.name,
      image: currentUser.image,
    };
  }, [forceGuestNav, currentUser]);

  const accountUser = me;

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
        'border-border bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-50 border-b backdrop-blur-xs',
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

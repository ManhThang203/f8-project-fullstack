'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';

import { BottomNav } from '@/components/layout/bottom-nav';
import { SiteAppGate } from '@/components/layout/site-app-gate';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteHeaderSsrFallback } from '@/components/layout/site-header-ssr-fallback';
import { ClientOnly } from '@/components/shared/client-only';
import { CurrentUserProvider } from '@/components/shared/current-user-context';
import { authClient } from '@/lib/auth-client';
import type { ServerAuthUser } from '@/lib/auth-user.types';

type Props = {
  children: ReactNode;
  initialUser: ServerAuthUser | null;
};

/** Kiểm tra route không cần padding-bottom cho bottom nav (Reels tự trừ chiều cao). */
function isReelsRoute(pathname: string): boolean {
  return pathname.startsWith('/reel');
}

function SiteLayoutHeader({ initialUser }: { initialUser: ServerAuthUser | null }) {
  const pathname = usePathname();
  const hideHeaderBelowLg = isReelsRoute(pathname);

  return (
    <ClientOnly fallback={<SiteHeaderSsrFallback hideBelowLg={hideHeaderBelowLg} />}>
      <SiteHeader initialUser={initialUser} />
    </ClientOnly>
  );
}

/** Bọc nội dung trang: chừa chỗ bottom nav khi đã đăng nhập (<lg). */
function SiteLayoutBody({ children, initialUser }: Props) {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const me = useMemo(() => session?.user ?? initialUser, [session?.user, initialUser]);
  const padBottom =
    me && !isReelsRoute(pathname) && !pathname.startsWith('/messages') ? 'pb-16 lg:pb-0' : undefined;

  return (
    <>
      <div className={padBottom}>{children}</div>
      <BottomNav initialUser={initialUser} />
    </>
  );
}

/** Client-side layout cho trang web. */
export function SiteLayoutClient({ children, initialUser }: Props) {
  return (
    <CurrentUserProvider value={initialUser}>
      <SiteAppGate>
        <SiteLayoutHeader initialUser={initialUser} />
        <SiteLayoutBody initialUser={initialUser}>{children}</SiteLayoutBody>
      </SiteAppGate>
    </CurrentUserProvider>
  );
}

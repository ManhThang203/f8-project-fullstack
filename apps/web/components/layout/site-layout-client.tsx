'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { BottomNav } from '@/components/layout/bottom-nav';
import { SiteAppGate } from '@/components/layout/site-app-gate';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteHeaderSsrFallback } from '@/components/layout/site-header-ssr-fallback';
import { CurrentUserProvider, useCurrentUser } from '@/components/shared/providers/current-user-context';
import { ClientOnly } from '@/components/shared/ui';
import type { ServerAuthUser } from '@/lib/auth';

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
function SiteLayoutBody({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user: me } = useCurrentUser();
  const padBottom =
    me && !isReelsRoute(pathname) && !pathname.startsWith('/messages') ? 'pb-16 lg:pb-0' : undefined;

  return (
    <>
      <div className={padBottom}>{children}</div>
      <BottomNav />
    </>
  );
}

/** Client-side layout cho trang web. */
export function SiteLayoutClient({ children, initialUser }: Props) {
  return (
    <CurrentUserProvider initialUser={initialUser}>
      <SiteAppGate>
        <SiteLayoutHeader initialUser={initialUser} />
        <SiteLayoutBody>{children}</SiteLayoutBody>
      </SiteAppGate>
    </CurrentUserProvider>
  );
}

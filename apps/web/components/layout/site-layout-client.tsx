'use client';

import type { ReactNode } from 'react';

import { SiteAppGate } from '@/components/layout/site-app-gate';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteHeaderSsrFallback } from '@/components/layout/site-header-ssr-fallback';
import { ClientOnly } from '@/components/shared/client-only';
import type { ServerAuthUser } from '@/lib/auth-user.types';

type Props = {
  children: ReactNode;
  initialUser: ServerAuthUser | null;
};
/** Client-side layout cho trang web. */
export function SiteLayoutClient({ children, initialUser }: Props) {
  /** Trang chào mừng toàn màn hình (giống như trang quản trị) cho đến khi các truy vấn ban đầu hoàn tất (tương tự như trang quản trị). */
  return (
    <SiteAppGate>
      <ClientOnly fallback={<SiteHeaderSsrFallback />}>
        <SiteHeader initialUser={initialUser} />
      </ClientOnly>
      {children}
    </SiteAppGate>
  );
}

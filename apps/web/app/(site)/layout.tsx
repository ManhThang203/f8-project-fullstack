import type { ReactNode } from 'react';

import { SiteHeader } from '@/components/layout/site-header';
import { SiteHeaderSsrFallback } from '@/components/layout/site-header-ssr-fallback';
import { ClientOnly } from '@/components/shared/client-only';
import { getServerSession } from '@/lib/auth-session.server';

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const serverSession = await getServerSession();
  const initialUser = serverSession?.user ?? null;

  return (
    <>
      <ClientOnly fallback={<SiteHeaderSsrFallback />}>
        <SiteHeader initialUser={initialUser} />
      </ClientOnly>
      {children}
    </>
  );
}

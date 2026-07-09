import type { ReactNode } from 'react';

import { SiteLayoutClient } from '@/components/layout/site-layout-client';
import { getServerSession } from '@/lib/server/auth-session.server';

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const serverSession = await getServerSession();
  const initialUser = serverSession?.user ?? null;

  return <SiteLayoutClient initialUser={initialUser}>{children}</SiteLayoutClient>;
}

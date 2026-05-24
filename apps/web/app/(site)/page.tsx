import type { Metadata } from 'next';

import { HomeFeed } from '@/components/home/feed';
import { HomeFeedSsrFallback } from '@/components/home/home-feed-ssr-fallback';
import { ClientOnly } from '@/components/shared/client-only';
import { getServerSession } from '@/lib/auth-session.server';

export const metadata: Metadata = {
  description: 'Bảng tin Cotsy',
};

export default async function HomePage() {
  const serverSession = await getServerSession();

  return (
    <main className="min-h-screen bg-background">
      <ClientOnly fallback={<HomeFeedSsrFallback />}>
        <HomeFeed initialUser={serverSession?.user ?? null} />
      </ClientOnly>
    </main>
  );
}

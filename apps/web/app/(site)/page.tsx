import type { Metadata } from 'next';

import { HomeFeed } from '@/components/home/feed/feed';
import { HomeFeedSsrFallback } from '@/components/home/feed/home-feed-ssr-fallback';
import { ClientOnly } from '@/components/shared/ui';
import { getServerSession } from '@/lib/server/auth-session.server';

export const metadata: Metadata = {
  description: 'Bảng tin Cotsy',
};

export default async function HomePage() {
  const serverSession = await getServerSession();

  return (
    <main className="bg-background min-h-dvh">
      <ClientOnly fallback={<HomeFeedSsrFallback />}>
        <HomeFeed initialUser={serverSession?.user ?? null} />
      </ClientOnly>
    </main>
  );
}

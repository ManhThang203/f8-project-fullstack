import type { Metadata } from 'next';

import { FollowListView } from '@/components/profile/follow-list-view';
import { ClientOnly } from '@/components/shared/client-only';

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username} · Người theo dõi`,
    description: `Người theo dõi @${username}`,
  };
}

export default async function FollowersPage({ params }: Props) {
  const { username } = await params;

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <ClientOnly
        fallback={
          <div className="text-muted-foreground mx-auto max-w-[600px] py-12 text-center text-sm">
            Đang tải…
          </div>
        }
      >
        <FollowListView username={username} title="Người theo dõi" mode="followers" />
      </ClientOnly>
    </main>
  );
}

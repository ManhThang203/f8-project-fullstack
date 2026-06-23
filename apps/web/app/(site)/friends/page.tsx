import type { Metadata } from 'next';

import { FriendsView } from '@/components/friends/friends-view';
import { ClientOnly } from '@/components/shared/client-only';

export const metadata: Metadata = {
  title: 'Bạn bè',
  description: 'Bạn bè và lời mời kết bạn',
};

export default function FriendsPage() {
  return (
    <main className="bg-background min-h-dvh py-4">
      <ClientOnly
        fallback={
          <div className="text-muted-foreground mx-auto max-w-[600px] py-12 text-center text-sm">
            Đang tải…
          </div>
        }
      >
        <FriendsView />
      </ClientOnly>
    </main>
  );
}

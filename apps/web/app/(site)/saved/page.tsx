import type { Metadata } from 'next';

import { SavedFeed } from '@/components/saved/saved-feed';
import { ClientOnly } from '@/components/shared/client-only';

export const metadata: Metadata = {
  title: 'Đã lưu',
  description: 'Bài viết bạn đã lưu',
};

export default function SavedPage() {
  return (
    <main className="bg-background min-h-screen py-4">
      <div className="mx-auto w-full max-w-2xl px-4">
        <h1 className="mb-4 text-xl font-semibold">Đã lưu</h1>
        <ClientOnly
          fallback={
            <p className="text-muted-foreground py-12 text-center text-sm">Đang tải…</p>
          }
        >
          <SavedFeed />
        </ClientOnly>
      </div>
    </main>
  );
}

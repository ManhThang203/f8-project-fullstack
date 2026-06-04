import type { Metadata } from 'next';
import { Suspense } from 'react';

import { MessagesSsrFallback } from '@/components/messages/messages-ssr-fallback';
import { MessagesView } from '@/components/messages/messages-view';
import { ClientOnly } from '@/components/shared/client-only';

export const metadata: Metadata = {
  title: 'Tin nhắn',
  description: 'Tin nhắn trực tiếp và nhóm',
};

function MessagesFallback() {
  return (
    <main className="min-h-screen bg-background">
      <div className="flex min-h-[50dvh] items-center justify-center text-sm text-muted-foreground">
        Đang tải…
      </div>
    </main>
  );
}

export default function MessagesPage() {
  return (
    <main className="fixed inset-0 top-14 bg-background overflow-hidden flex flex-col">
      <Suspense fallback={<MessagesFallback />}>
        <ClientOnly fallback={<MessagesSsrFallback />}>
          <MessagesView />
        </ClientOnly>
      </Suspense>
    </main>
  );
}

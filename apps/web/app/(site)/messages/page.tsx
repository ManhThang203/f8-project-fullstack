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
    <main className="bg-background min-h-dvh">
      <div className="text-muted-foreground flex min-h-[50dvh] items-center justify-center text-sm">
        Đang tải…
      </div>
    </main>
  );
}

export default function MessagesPage() {
  return (
    <main className="bg-background fixed inset-x-0 top-14 bottom-0 flex flex-col overflow-hidden">
      <Suspense fallback={<MessagesFallback />}>
        <ClientOnly fallback={<MessagesSsrFallback />}>
          <MessagesView />
        </ClientOnly>
      </Suspense>
    </main>
  );
}

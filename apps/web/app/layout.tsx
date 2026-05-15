import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { ChatDockProvider } from '@/components/chat/chat-dock-context';
import { MessengerChatDock } from '@/components/chat/messenger-chat-dock';
import { ClientOnly } from '@/components/shared/client-only';
import { QueryProvider } from '@/components/shared/query-provider';

import './globals.css';

export const metadata: Metadata = {
  title: 'Threads Clone',
  description: 'A production-ready Threads-like social media app.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <QueryProvider>
          <ChatDockProvider>
            {children}
            <ClientOnly fallback={null}>
              <MessengerChatDock />
            </ClientOnly>
          </ChatDockProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

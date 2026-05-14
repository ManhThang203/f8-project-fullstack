import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { ChatDockProvider } from '@/components/chat/chat-dock-context';
import { MessengerChatDock } from '@/components/chat/messenger-chat-dock';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteHeaderSsrFallback } from '@/components/layout/site-header-ssr-fallback';
import { ClientOnly } from '@/components/shared/client-only';
import { QueryProvider } from '@/components/shared/query-provider';
import { getServerSession } from '@/lib/auth-session.server';

import './globals.css';

export const metadata: Metadata = {
  title: 'Threads Clone',
  description: 'A production-ready Threads-like social media app.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const serverSession = await getServerSession();
  const initialUser = serverSession?.user ?? null;

  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <QueryProvider>
          <ChatDockProvider>
            <ClientOnly fallback={<SiteHeaderSsrFallback />}>
              <SiteHeader initialUser={initialUser} />
            </ClientOnly>
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

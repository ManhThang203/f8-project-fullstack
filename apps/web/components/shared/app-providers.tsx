'use client';

import type { ReactNode } from 'react';

import { ChatDockProvider } from '@/components/chat/chat-dock-context';
import { MessengerChatDock } from '@/components/chat/messenger-chat-dock';
import { AppToaster } from '@/components/shared/app-toaster';
import { ClientOnly } from '@/components/shared/client-only';
import { QueryProvider } from '@/components/shared/query-provider';

/**
 * Client providers (chat, query, toast). Loaded via dynamic import from layout
 * so the root `app/layout` chunk stays small and dev ChunkLoadError timeouts are less likely.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AppToaster />
      <ChatDockProvider>
        {children}
        <ClientOnly fallback={null}>
          <MessengerChatDock />
        </ClientOnly>
      </ChatDockProvider>
    </QueryProvider>
  );
}

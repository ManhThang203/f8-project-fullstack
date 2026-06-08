'use client';

import type { ReactNode } from 'react';

import { AppToaster } from '@/components/shared/app-toaster';
import { QueryProvider } from '@/components/shared/query-provider';

export function ProvidersShell({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AppToaster />
      {children}
    </QueryProvider>
  );
}

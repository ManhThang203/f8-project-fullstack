'use client';

import type { ReactNode } from 'react';

import { AppToaster } from '@/components/shared/app-toaster';
import { QueryProvider } from '@/components/shared/query-provider';
import { ThemeProvider } from '@/components/shared/theme-provider';

export function ProvidersShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AppToaster />
        {children}
      </QueryProvider>
    </ThemeProvider>
  );
}

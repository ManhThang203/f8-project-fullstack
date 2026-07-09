'use client';

import type { ReactNode } from 'react';

import { AppToaster } from './app-toaster';
import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';

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

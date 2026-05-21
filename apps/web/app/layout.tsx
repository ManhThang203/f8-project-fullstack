import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { ProvidersShell } from '@/components/shared/providers-shell';

import './globals.css';

export const metadata: Metadata = {
  title: 'Threads Clone',
  description: 'A production-ready Threads-like social media app.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <ProvidersShell>{children}</ProvidersShell>
      </body>
    </html>
  );
}

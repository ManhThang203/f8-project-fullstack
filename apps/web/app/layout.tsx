import type { Metadata } from 'next';
import type { ReactNode } from 'react';

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
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}

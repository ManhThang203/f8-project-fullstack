import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { ProvidersShell } from '@/components/shared/providers-shell';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Cotsy',
    template: 'Cotsy | %s',
  },
  description: 'Cotsy is a social media app.',
  icons: {
    icon: '/icon/Logo-app-2.webp',
    apple: '/icon/Logo-app-2.webp',
  },
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

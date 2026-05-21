'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

const AppProviders = dynamic(
  () => import('@/components/shared/app-providers').then((m) => m.AppProviders),
  { ssr: false },
);

export function ProvidersShell({ children }: { children: ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}

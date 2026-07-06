import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { SettingsGate } from '@/components/settings/settings-gate';

export const metadata: Metadata = {
  title: 'Cài đặt',
  description: 'Quản lý tài khoản và cài đặt ứng dụng',
};

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <SettingsGate>{children}</SettingsGate>;
}

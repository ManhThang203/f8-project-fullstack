import type { Metadata } from 'next';

import { AccountSettingsView } from '@/components/settings/sections';
import { SettingsShell } from '@/components/settings/settings-shell';

export const metadata: Metadata = {
  title: 'Tài khoản',
  description: 'Quản lý username, email và thông tin công khai',
};

export default function SettingsAccountPage() {
  return (
    <SettingsShell title="Tài khoản" description="Username, email và thông tin hiển thị công khai.">
      <AccountSettingsView />
    </SettingsShell>
  );
}

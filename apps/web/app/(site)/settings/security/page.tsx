import type { Metadata } from 'next';

import { SecuritySettingsSection } from '@/components/settings/security-settings-section';
import { SettingsShell } from '@/components/settings/settings-shell';

export const metadata: Metadata = {
  title: 'Bảo mật',
  description: 'Đổi mật khẩu và quản lý phiên đăng nhập',
};

export default function SettingsSecurityPage() {
  return (
    <SettingsShell title="Bảo mật" description="Bảo vệ tài khoản và mật khẩu của bạn.">
      <SecuritySettingsSection />
    </SettingsShell>
  );
}

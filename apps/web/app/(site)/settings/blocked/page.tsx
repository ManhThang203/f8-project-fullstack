import type { Metadata } from 'next';

import { BlockedSettingsSection } from '@/components/settings/blocked-settings-section';
import { SettingsShell } from '@/components/settings/settings-shell';

export const metadata: Metadata = {
  title: 'Đã chặn',
  description: 'Quản lý danh sách người dùng đã chặn',
};

export default function SettingsBlockedPage() {
  return (
    <SettingsShell title="Đã chặn" description="Xem và bỏ chặn người dùng.">
      <BlockedSettingsSection />
    </SettingsShell>
  );
}

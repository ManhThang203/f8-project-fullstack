import type { Metadata } from 'next';

import { NotificationsSettingsSection } from '@/components/settings/notifications-settings-section';
import { SettingsShell } from '@/components/settings/settings-shell';

export const metadata: Metadata = {
  title: 'Thông báo',
  description: 'Tùy chọn loại thông báo bạn muốn nhận',
};

export default function SettingsNotificationsPage() {
  return (
    <SettingsShell title="Thông báo" description="Chọn sự kiện bạn muốn được thông báo.">
      <NotificationsSettingsSection />
    </SettingsShell>
  );
}

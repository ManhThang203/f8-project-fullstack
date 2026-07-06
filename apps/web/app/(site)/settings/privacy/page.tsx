import type { Metadata } from 'next';

import { PrivacySettingsSection } from '@/components/settings/privacy-settings-section';
import { SettingsShell } from '@/components/settings/settings-shell';

export const metadata: Metadata = {
  title: 'Quyền riêng tư',
  description: 'Kiểm soát ai thấy trạng thái hoạt động của bạn',
};

export default function SettingsPrivacyPage() {
  return (
    <SettingsShell title="Quyền riêng tư" description="Kiểm soát thông tin hiển thị với người khác.">
      <PrivacySettingsSection />
    </SettingsShell>
  );
}

import type { Metadata } from 'next';

import { AppearanceSettingsSection } from '@/components/settings/appearance-settings-section';
import { SettingsShell } from '@/components/settings/settings-shell';

export const metadata: Metadata = {
  title: 'Giao diện',
  description: 'Chọn chế độ sáng hoặc tối',
};

export default function SettingsAppearancePage() {
  return (
    <SettingsShell title="Giao diện" description="Tùy chỉnh chế độ hiển thị ứng dụng.">
      <AppearanceSettingsSection />
    </SettingsShell>
  );
}

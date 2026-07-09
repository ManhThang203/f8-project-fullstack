'use client';

import { useEffect, useState } from 'react';

import { SettingsSection } from '@/components/settings/settings-section';
import { SettingsToggle } from '@/components/settings/settings-toggle';
import { useMySettings, useSettingsMutation } from '@/hooks/queries/settings';

/** Toggle trạng thái hoạt động trong chat. */
export function PrivacySettingsSection() {
  const { data, isLoading } = useMySettings();
  const { commit, isPending } = useSettingsMutation();
  const [showActivity, setShowActivity] = useState(true);

  useEffect(() => {
    if (data) setShowActivity(data.showActivityStatus);
  }, [data]);

  function handleToggle(checked: boolean) {
    setShowActivity(checked);
    commit(
      { showActivityStatus: checked },
      {
        successMessage: 'Đã cập nhật quyền riêng tư',
        rollback: () => setShowActivity(!checked),
      },
    );
  }

  return (
    <SettingsSection
      title="Trạng thái hoạt động"
      description="Kiểm soát ai có thể thấy bạn đang online hoặc lần cuối hoạt động trong chat."
    >
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Đang tải…</p>
      ) : (
        <SettingsToggle
          id="show-activity-status"
          label="Hiển thị trạng thái hoạt động"
          description="Khi tắt, người khác sẽ không thấy bạn online hoặc last seen trong tin nhắn 1-1."
          checked={showActivity}
          disabled={isPending}
          onCheckedChange={handleToggle}
        />
      )}
    </SettingsSection>
  );
}

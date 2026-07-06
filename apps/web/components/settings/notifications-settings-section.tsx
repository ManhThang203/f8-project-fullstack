'use client';

import type { NotificationPreferenceKey, NotificationPreferences } from '@costy/shared';
import { useEffect, useState } from 'react';

import { SettingsSection } from '@/components/settings/settings-section';
import { SettingsToggle } from '@/components/settings/settings-toggle';
import { useMySettings } from '@/hooks/queries/use-my-settings';
import { useSettingsMutation } from '@/hooks/queries/use-settings-mutation';

const PREFERENCE_ITEMS: {
  key: NotificationPreferenceKey;
  label: string;
  description: string;
}[] = [
  {
    key: 'postLiked',
    label: 'Thích bài viết',
    description: 'Khi ai đó thích bài viết của bạn.',
  },
  {
    key: 'postReplied',
    label: 'Trả lời bài viết',
    description: 'Khi có người trả lời bài viết của bạn.',
  },
  {
    key: 'postCommentedFollowed',
    label: 'Bình luận từ người bạn theo dõi',
    description: 'Khi người bạn theo dõi bình luận bài viết.',
  },
  {
    key: 'userFollowed',
    label: 'Theo dõi mới',
    description: 'Khi có người theo dõi bạn.',
  },
  {
    key: 'friendRequest',
    label: 'Lời mời kết bạn',
    description: 'Khi nhận lời mời kết bạn mới.',
  },
  {
    key: 'friendAccepted',
    label: 'Chấp nhận kết bạn',
    description: 'Khi lời mời kết bạn được chấp nhận.',
  },
  {
    key: 'mention',
    label: 'Nhắc đến (@mention)',
    description: 'Khi ai đó nhắc đến bạn trong bài viết hoặc bình luận.',
  },
];

/** Bật/tắt từng loại thông báo push/in-app. */
export function NotificationsSettingsSection() {
  const { data, isLoading } = useMySettings();
  const { commit, isPending } = useSettingsMutation();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    if (data) setPrefs(data.notificationPreferences);
  }, [data]);

  function handleToggle(key: NotificationPreferenceKey, checked: boolean) {
    if (!prefs) return;
    const prev = prefs[key];
    setPrefs({ ...prefs, [key]: checked });
    commit(
      { notificationPreferences: { [key]: checked } },
      {
        successMessage: 'Đã cập nhật thông báo',
        rollback: () => setPrefs((current) => (current ? { ...current, [key]: prev } : current)),
      },
    );
  }

  return (
    <SettingsSection
      title="Thông báo trong ứng dụng"
      description="Chọn loại sự kiện bạn muốn nhận thông báo."
    >
      {isLoading || !prefs ? (
        <p className="text-muted-foreground text-sm">Đang tải…</p>
      ) : (
        <div className="divide-border divide-y">
          {PREFERENCE_ITEMS.map((item) => (
            <SettingsToggle
              key={item.key}
              id={`notif-${item.key}`}
              label={item.label}
              description={item.description}
              checked={prefs[item.key]}
              disabled={isPending}
              onCheckedChange={(checked) => handleToggle(item.key, checked)}
            />
          ))}
        </div>
      )}
    </SettingsSection>
  );
}

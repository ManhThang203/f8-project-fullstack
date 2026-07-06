'use client';

import type { UpdateUserSettingsBody } from '@costy/shared';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { useUpdateMySettings } from '@/hooks/queries/use-update-settings';

type CommitOptions = {
  /** Toast hiển thị khi lưu thành công. */
  successMessage: string;
  /** Khôi phục state optimistic khi lưu thất bại. */
  rollback: () => void;
};

/**
 * Bọc useUpdateMySettings với pattern optimistic dùng chung cho các section cài đặt:
 * gọi mutate, toast thành công, và rollback + toast lỗi khi thất bại.
 */
export function useSettingsMutation() {
  const updateSettings = useUpdateMySettings();

  const commit = useCallback(
    (payload: UpdateUserSettingsBody, { successMessage, rollback }: CommitOptions) => {
      updateSettings.mutate(payload, {
        onSuccess: () => toast.success(successMessage),
        onError: (err) => {
          rollback();
          toast.error(err.message);
        },
      });
    },
    [updateSettings],
  );

  return { commit, isPending: updateSettings.isPending };
}

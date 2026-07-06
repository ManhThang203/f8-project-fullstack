'use client';

import { changePasswordSettingsSchema, type ChangePasswordSettingsForm } from '@costy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/shared/button';
import {
  settingsErrorClass,
  settingsFieldClass,
  settingsInputClass,
  settingsLabelClass,
} from '@/components/settings/settings-input-class';
import { SettingsSection } from '@/components/settings/settings-section';
import { authClient } from '@/lib/auth-client';

/** Form đổi mật khẩu khi đang đăng nhập. */
export function SecuritySettingsSection() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordSettingsForm>({
    resolver: zodResolver(changePasswordSettingsSchema),
  });

  async function onSubmit(data: ChangePasswordSettingsForm) {
    const res = await authClient.changePassword({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
      revokeOtherSessions: true,
    });

    if (res.error) {
      toast.error(res.error.message ?? 'Không thể đổi mật khẩu');
      return;
    }

    reset();
    toast.success('Đã đổi mật khẩu và đăng xuất các thiết bị khác');
  }

  return (
    <SettingsSection
      title="Mật khẩu"
      description="Đổi mật khẩu và đăng xuất các phiên đăng nhập khác."
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className={settingsFieldClass}>
          <label className={settingsLabelClass} htmlFor="current-password">
            Mật khẩu hiện tại
          </label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            className={settingsInputClass}
            aria-invalid={errors.currentPassword ? true : undefined}
            {...register('currentPassword')}
          />
          {errors.currentPassword ? (
            <p className={settingsErrorClass}>{errors.currentPassword.message}</p>
          ) : null}
        </div>

        <div className={settingsFieldClass}>
          <label className={settingsLabelClass} htmlFor="new-password">
            Mật khẩu mới
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            className={settingsInputClass}
            aria-invalid={errors.newPassword ? true : undefined}
            {...register('newPassword')}
          />
          {errors.newPassword ? (
            <p className={settingsErrorClass}>{errors.newPassword.message}</p>
          ) : null}
        </div>

        <div className={settingsFieldClass}>
          <label className={settingsLabelClass} htmlFor="confirm-password">
            Nhập lại mật khẩu mới
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            className={settingsInputClass}
            aria-invalid={errors.confirmPassword ? true : undefined}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword ? (
            <p className={settingsErrorClass}>{errors.confirmPassword.message}</p>
          ) : null}
        </div>

        <Button type="submit" variant="primary" size="md" loading={isSubmitting} className="self-start">
          Đổi mật khẩu
        </Button>
      </form>
    </SettingsSection>
  );
}
